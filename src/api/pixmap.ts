import type { MeResponse, CanvasInfo, ChunkCoord, PixelPlaceResult } from '../types';
import { CHUNK_SIZE } from '../types';
import { Logger } from '../utils/logger';
import { getTargetWindow } from '../utils/env';

declare const unsafeWindow: Window & typeof globalThis;

function getBaseUrl(): string {
  try {
    if (typeof unsafeWindow !== 'undefined') return unsafeWindow.location.origin;
  } catch {}
  return window.location.origin;
}

const BASE_URL = getBaseUrl();

const nativeFetch: typeof fetch = (() => {
  try {
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.fetch) {
      return unsafeWindow.fetch.bind(unsafeWindow);
    }
  } catch {}
  return window.fetch.bind(window);
})();

function isPixelyaSite(): boolean {
  return BASE_URL.includes('pixelya.fun');
}

const PIXEL_UPDATE_OP = 0xC1;
const PIXEL_RETURN_OP = 0xC3;
const REG_CANVAS_OP = 0xA0;

let cachedMe: MeResponse | null = null;
let cachedCanvas: CanvasInfo | null = null;
let cachedCanvasId: number = 0;
const CHUNK_CACHE_MAX_SIZE = 512;
const chunkCache: Map<string, Uint8Array> = new Map();
const localPixelOverlay: Map<string, number> = new Map();

function getOverlayKey(canvasId: number, x: number, y: number): string {
  return `${canvasId}_${x}_${y}`;
}

export function setLocalPixel(canvasId: number, x: number, y: number, color: number): void {
  localPixelOverlay.set(getOverlayKey(canvasId, x, y), color);
  updateChunkPixel(canvasId, x, y, color);
}

function getLocalPixel(canvasId: number, x: number, y: number): number | null {
  const val = localPixelOverlay.get(getOverlayKey(canvasId, x, y));
  return val !== undefined ? val : null;
}

export function clearLocalPixelOverlay(): void {
  localPixelOverlay.clear();
}

function touchChunkCache(key: string, data: Uint8Array): void {
  if (chunkCache.has(key)) {
    chunkCache.delete(key);
  } else if (chunkCache.size >= CHUNK_CACHE_MAX_SIZE) {
    const oldest = chunkCache.keys().next().value;
    if (oldest !== undefined) chunkCache.delete(oldest);
  }
  chunkCache.set(key, data);
}

let pixelWebSocket: WebSocket | null = null;
const pendingPixelResolvers: Map<string, (result: PixelPlaceResult) => void> = new Map();

interface PlacedPixelEntry {
  x: number;
  y: number;
  color: number;
  time: number;
  success: boolean;
  error?: string;
}

const MAX_PLACED_HISTORY = 20;
const placedPixelHistory: PlacedPixelEntry[] = [];

export function getPlacedPixelHistory(): PlacedPixelEntry[] {
  return [...placedPixelHistory];
}

function recordPlacedPixel(entry: PlacedPixelEntry): void {
  placedPixelHistory.unshift(entry);
  if (placedPixelHistory.length > MAX_PLACED_HISTORY) {
    placedPixelHistory.length = MAX_PLACED_HISTORY;
  }
}

async function fetchWithRetry(url: string, maxRetries: number = 5): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await nativeFetch(url, { credentials: 'include' });
    lastResponse = response;
    if (response.status === 429) {
      const delayMs = Math.min(2000 * Math.pow(2, attempt), 30000) + Math.random() * 1000;
      Logger.warn(`Rate limited on ${url}, retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }
    return response;
  }
  return lastResponse!;
}

export async function fetchMe(): Promise<MeResponse> {
  const meResponse = await fetchWithRetry(`${BASE_URL}/api/me`);
  if (!meResponse.ok) {
    throw new Error(`Failed to fetch /api/me: ${meResponse.status}`);
  }
  const meData = await meResponse.json();

  const hasCanvases = meData.canvases && typeof meData.canvases === 'object' && Object.keys(meData.canvases).length > 0;

  if (hasCanvases) {
    Logger.info(`Canvas data found in /api/me response (${Object.keys(meData.canvases).length} canvases)`);
  } else {
    Logger.info('No canvases in /api/me, trying /api/canvases...');
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 500));
    try {
      const canvasesResponse = await fetchWithRetry(`${BASE_URL}/api/canvases`);
      if (canvasesResponse.ok) {
        const canvasesData = await canvasesResponse.json();
        meData.canvases = canvasesData.canvases || canvasesData || {};
        Logger.info(`Canvas data loaded from /api/canvases (${Object.keys(meData.canvases).length} canvases)`);
      } else {
        Logger.warn(`/api/canvases returned ${canvasesResponse.status}, no canvas data available`);
      }
    } catch (err) {
      Logger.warn(`/api/canvases fetch failed: ${err}`);
    }
  }

  if (!meData.canvases || Object.keys(meData.canvases).length === 0) {
    throw new Error('No canvas data found in /api/me or /api/canvases');
  }

  cachedMe = meData;
  for (const [id, canvas] of Object.entries(meData.canvases)) {
    const c = canvas as CanvasInfo;
    Logger.info(`Canvas ${id}: "${c.title}" size=${c.size} cli=${c.cli} bcd=${c.bcd} cds=${c.cds}`);
  }
  return meData;
}

export function getCachedMe(): MeResponse | null {
  return cachedMe;
}

export function getMainCanvas(): CanvasInfo | null {
  if (cachedCanvas) return cachedCanvas;
  if (!cachedMe || !cachedMe.canvases) return null;
  const idStr = String(cachedCanvasId);
  if (cachedMe.canvases[idStr]) {
    cachedCanvas = cachedMe.canvases[idStr];
    Logger.info(`Selected canvas ID: ${cachedCanvasId}`);
    return cachedCanvas;
  }
  const fallbackId = Object.keys(cachedMe.canvases)[0];
  if (fallbackId) {
    cachedCanvasId = parseInt(fallbackId, 10);
    cachedCanvas = cachedMe.canvases[fallbackId];
    Logger.info(`Fallback canvas ID: ${cachedCanvasId}`);
    return cachedCanvas;
  }
  return null;
}

export function getCanvasId(): number {
  return cachedCanvasId;
}

export function detectCanvasIdFromHash(): number | null {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return null;
  const hashIdent = hash.split(',')[0];
  if (!hashIdent || !/^[a-zA-Z]+$/.test(hashIdent)) return null;
  if (!cachedMe || !cachedMe.canvases) return null;
  const identLower = hashIdent.toLowerCase();
  Logger.info(`Detecting canvas from hash ident: "${identLower}"`);
  for (const [id, canvas] of Object.entries(cachedMe.canvases)) {
    const canvasIdent = (canvas.ident || '').toLowerCase();
    Logger.info(`  Canvas ${id}: ident="${canvasIdent}" title="${canvas.title}"`);
    if (canvasIdent === identLower) {
      Logger.info(`  MATCH: hash ident "${identLower}" -> canvas ID ${id}`);
      return parseInt(id, 10);
    }
  }
  Logger.warn(`No canvas found for hash ident "${identLower}"`);
  return null;
}

export function setCanvasId(id: number): void {
  if (cachedCanvasId !== id) {
    cachedCanvasId = id;
    cachedCanvas = null;
  }
}

export function getCanvasColors(): number[][] {
  const canvas = getMainCanvas();
  if (!canvas || !canvas.colors || canvas.colors.length === 0) return [];
  return canvas.colors;
}

function pixelToChunk(x: number, y: number, canvasSize: number): ChunkCoord {
  const offset = canvasSize / 2;
  const cx = Math.floor((x + offset) / CHUNK_SIZE);
  const cy = Math.floor((y + offset) / CHUNK_SIZE);
  return { cx, cy };
}

async function fetchChunk(canvasId: number, cx: number, cy: number): Promise<Uint8Array | null> {
  const key = `${canvasId}_${cx}_${cy}`;
  if (chunkCache.has(key)) {
    return chunkCache.get(key)!;
  }

  const url = `${BASE_URL}/chunks/${canvasId}/${cx}/${cy}.bmp`;
  try {
    const response = await nativeFetch(url, { credentials: 'include' });
    if (response.status === 404) {
      const emptyChunk = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
      touchChunkCache(key, emptyChunk);
      return emptyChunk;
    }
    if (!response.ok) {
      Logger.error(`Failed to fetch chunk ${cx},${cy}: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    touchChunkCache(key, data);
    return data;
  } catch (err) {
    Logger.error(`Error fetching chunk ${cx},${cy}:`, err);
    return null;
  }
}

function getPixelFromChunk(
  chunkData: Uint8Array,
  x: number,
  y: number,
  canvasSize: number
): number {
  const offset = canvasSize / 2;
  const localX = ((x + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const localY = ((y + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const index = localY * CHUNK_SIZE + localX;
  return chunkData[index] || 0;
}

export async function getFreshPixelColor(canvasId: number, x: number, y: number, canvasSize: number): Promise<number | null> {
  const local = getLocalPixel(canvasId, x, y);
  if (local !== null) return local;
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  invalidateChunkCache(cx, cy, canvasId);
  const chunkData = await fetchChunk(canvasId, cx, cy);
  if (!chunkData) return null;
  return getPixelFromChunk(chunkData, x, y, canvasSize);
}

export async function prefetchChunksForPixels(
  canvasId: number,
  pixels: { x: number; y: number }[],
  canvasSize: number
): Promise<void> {
  const chunksToFetch = new Set<string>();

  for (const pixel of pixels) {
    const { cx, cy } = pixelToChunk(pixel.x, pixel.y, canvasSize);
    const key = `${canvasId}_${cx}_${cy}`;
    if (!chunkCache.has(key)) {
      chunksToFetch.add(`${cx},${cy}`);
    }
  }

  const chunkList = Array.from(chunksToFetch).map(k => {
    const [cx, cy] = k.split(',').map(Number);
    return { cx, cy };
  });

  if (chunkList.length === 0) return;

  Logger.info(`Prefetching ${chunkList.length} chunks...`);
  const startTime = Date.now();

  const CONCURRENCY = 6;
  for (let i = 0; i < chunkList.length; i += CONCURRENCY) {
    const batch = chunkList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(({ cx, cy }) => fetchChunk(canvasId, cx, cy)));
  }

  const elapsed = Date.now() - startTime;
  Logger.info(`Prefetch complete in ${elapsed}ms`);
}

export function getPixelColorSync(
  canvasId: number,
  x: number,
  y: number,
  canvasSize: number
): number | null {
  const local = getLocalPixel(canvasId, x, y);
  if (local !== null) return local;
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  const key = `${canvasId}_${cx}_${cy}`;
  const chunkData = chunkCache.get(key);
  if (!chunkData) return null;
  return getPixelFromChunk(chunkData, x, y, canvasSize);
}

function updateChunkPixel(canvasId: number, x: number, y: number, color: number): void {
  const canvas = getMainCanvas();
  if (!canvas) return;
  const canvasSize = canvas.size;
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  const key = `${canvasId}_${cx}_${cy}`;
  const chunkData = chunkCache.get(key);
  if (!chunkData) return;
  const offset = canvasSize / 2;
  const localX = ((x + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const localY = ((y + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const index = localY * CHUNK_SIZE + localX;
  chunkData[index] = color;
}

function invalidateChunkCache(cx: number, cy: number, canvasId: number): void {
  const key = `${canvasId}_${cx}_${cy}`;
  chunkCache.delete(key);
}

export function clearChunkCache(): void {
  chunkCache.clear();
}

export function findClosestColorIndex(r: number, g: number, b: number, colors: number[][]): number {
  let minDist = Infinity;
  let closestIndex = 1;
  const startIndex = colors.length > 1 ? 1 : 0;

  for (let i = startIndex; i < colors.length; i++) {
    const [cr, cg, cb] = colors[i];
    const dr = r - cr;
    const dg = g - cg;
    const db = b - cb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
}

function findSiteWebSocket(): WebSocket | null {
  if (pixelWebSocket && pixelWebSocket.readyState === WebSocket.OPEN) {
    return pixelWebSocket;
  }

  const win = window as unknown as Record<string, unknown>;

  const possibleNames = [
    'pixelPlanetWebSocket', 'socket', 'ws', 'webSocket',
    'ppfunSocket', 'pixelSocket', 'socketClient', '__SOCKET__'
  ];

  for (const name of possibleNames) {
    const val = win[name];
    if (val instanceof WebSocket && val.readyState === WebSocket.OPEN) {
      pixelWebSocket = val;
      setupWebSocketListener(val);
      return val;
    }
    if (val && typeof val === 'object' && 'ws' in (val as Record<string, unknown>)) {
      const ws = (val as Record<string, unknown>).ws;
      if (ws instanceof WebSocket && ws.readyState === WebSocket.OPEN) {
        pixelWebSocket = ws;
        setupWebSocketListener(ws);
        return ws;
      }
    }
  }

  const allWebSockets = findAllWebSockets();
  if (allWebSockets.length > 0) {
    const ws = allWebSockets[0];
    pixelWebSocket = ws;
    setupWebSocketListener(ws);
    return ws;
  }

  return null;
}

function findAllWebSockets(): WebSocket[] {
  const sockets: WebSocket[] = [];
  const seen = new Set<WebSocket>();

  function checkValue(val: unknown): void {
    if (!val || typeof val !== 'object') return;

    if (val instanceof WebSocket) {
      if (!seen.has(val) && val.readyState === WebSocket.OPEN) {
        seen.add(val);
        const url = val.url || '';
        if (url.includes('/ws')) {
          sockets.push(val);
        }
      }
      return;
    }

    const obj = val as Record<string, unknown>;
    if (obj.ws instanceof WebSocket && !seen.has(obj.ws)) {
      if (obj.ws.readyState === WebSocket.OPEN) {
        seen.add(obj.ws);
        sockets.push(obj.ws);
      }
    }
  }

  const windows: Record<string, unknown>[] = [window as unknown as Record<string, unknown>];
  try {
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
      windows.push(unsafeWindow as unknown as Record<string, unknown>);
    }
  } catch {}

  for (const win of windows) {
    for (const key of Object.keys(win)) {
      try {
        checkValue(win[key]);
      } catch {}
    }
  }

  return sockets;
}

let listenerAttached = false;

function sendRegisterCanvas(ws: WebSocket): void {
  try {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setInt8(0, REG_CANVAS_OP);
    view.setInt8(1, cachedCanvasId);
    ws.send(buffer);
    Logger.debug(`Sent RegisterCanvas for canvas ${cachedCanvasId}`);
  } catch {}
}

function setupWebSocketListener(ws: WebSocket): void {
  if (listenerAttached) return;
  listenerAttached = true;

  sendRegisterCanvas(ws);

  ws.addEventListener('message', (event: MessageEvent) => {
    handleWebSocketMessage(event);
  });

  ws.addEventListener('close', () => {
    pixelWebSocket = null;
    listenerAttached = false;
    setTimeout(() => retryFindWebSocket(), 2000 + Math.random() * 1000);
  });

  ws.addEventListener('error', () => {
    pixelWebSocket = null;
    listenerAttached = false;
    setTimeout(() => retryFindWebSocket(), 3000 + Math.random() * 1000);
  });
}

function hookWebSocketCreation(): void {
  const targetWindow = getTargetWindow();
  const OriginalWebSocket = targetWindow.WebSocket;

  const originalSend = OriginalWebSocket.prototype.send;
  OriginalWebSocket.prototype.send = function(this: WebSocket, data: any) {
    if (!pixelWebSocket && this.url && this.url.includes('/ws') && this.readyState === WebSocket.OPEN) {
      pixelWebSocket = this;
      listenerAttached = false;
      setupWebSocketListener(this);
    }
    return originalSend.call(this, data);
  };

  if (isPixelyaSite()) {
    const WebSocketProxy = new Proxy(OriginalWebSocket, {
      construct(target, args) {
        const urlStr = String(args[0]);

        if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
          throw new DOMException('Failed to construct \'WebSocket\': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.', 'SecurityError');
        }

        const ws: WebSocket = args.length > 1
          ? new target(args[0], args[1])
          : new target(args[0]);

        if (urlStr.includes('/ws')) {
          ws.addEventListener('open', () => {
            pixelWebSocket = ws;
            listenerAttached = false;
            setupWebSocketListener(ws);
          });

          ws.addEventListener('close', () => {
            if (pixelWebSocket === ws) {
              pixelWebSocket = null;
              listenerAttached = false;
            }
          });
        }

        return ws;
      },
    });

    Object.defineProperty(targetWindow, 'WebSocket', {
      value: WebSocketProxy,
      writable: true,
      configurable: true,
    });
  } else {
    const stealthyWebSocket = function(this: WebSocket, url: string | URL, protocols?: string | string[]) {
      const ws = protocols
        ? new OriginalWebSocket(url, protocols)
        : new OriginalWebSocket(url);

      const urlStr = url.toString();

      if (urlStr.includes('/ws')) {
        ws.addEventListener('open', () => {
          pixelWebSocket = ws;
          listenerAttached = false;
          setupWebSocketListener(ws);
        });

        ws.addEventListener('close', () => {
          if (pixelWebSocket === ws) {
            pixelWebSocket = null;
            listenerAttached = false;
          }
        });
      }

      return ws;
    } as unknown as typeof WebSocket;

    stealthyWebSocket.prototype = OriginalWebSocket.prototype;
    Object.assign(stealthyWebSocket, {
      CONNECTING: OriginalWebSocket.CONNECTING,
      OPEN: OriginalWebSocket.OPEN,
      CLOSING: OriginalWebSocket.CLOSING,
      CLOSED: OriginalWebSocket.CLOSED,
    });

    Object.defineProperty(stealthyWebSocket, 'name', { value: 'WebSocket', writable: false, configurable: true });
    Object.defineProperty(stealthyWebSocket, 'toString', {
      value: function() { return 'function WebSocket() { [native code] }'; },
      writable: true,
      configurable: true
    });
    Object.defineProperty(stealthyWebSocket.prototype, 'constructor', {
      value: stealthyWebSocket,
      writable: true,
      configurable: true
    });

    Object.defineProperty(targetWindow, 'WebSocket', {
      value: stealthyWebSocket,
      writable: true,
      configurable: true,
    });
  }
}

export function tryConnectWebSocket(): void {
  const existing = findSiteWebSocket();
  if (existing) {
    return;
  }
  retryFindWebSocket();
}

function retryFindWebSocket(): void {
  let attempts = 0;
  const maxAttempts = 30;

  const interval = setInterval(() => {
    attempts++;
    const ws = findSiteWebSocket();
    if (ws) {
      clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 500 + Math.random() * 200);
}

function handleWebSocketMessage(event: MessageEvent): void {
  if (!(event.data instanceof ArrayBuffer)) return;

  const data = new DataView(event.data);
  const opcode = data.getUint8(0);

  if (opcode === PIXEL_UPDATE_OP && data.byteLength >= 7) {
    const ci = data.getUint8(1);
    const cj = data.getUint8(2);
    const cId = cachedCanvasId;
    const key = `${cId}_${ci}_${cj}`;
    const chunkData = chunkCache.get(key);
    const canvas = getMainCanvas();
    let off = data.byteLength;
    while (off > 3) {
      const color = data.getUint8(off -= 1);
      const offsetL = data.getUint16(off -= 2);
      const offsetH = data.getUint8(off -= 1) << 16;
      const offset = offsetH | offsetL;
      if (chunkData && offset < chunkData.length) {
        chunkData[offset] = color;
      }
      if (canvas) {
        const canvasSize = canvas.size;
        const halfSize = canvasSize / 2;
        const localX = offset % CHUNK_SIZE;
        const localY = Math.floor(offset / CHUNK_SIZE);
        const worldX = ci * CHUNK_SIZE + localX - halfSize;
        const worldY = cj * CHUNK_SIZE + localY - halfSize;
        const overlayKey = getOverlayKey(cId, worldX, worldY);
        if (localPixelOverlay.has(overlayKey)) {
          localPixelOverlay.set(overlayKey, color);
        }
      }
    }
  }

  if (opcode === PIXEL_RETURN_OP && data.byteLength >= 8 && pendingPixelResolvers.size > 0) {
    const retCode = data.getUint8(1);
    const rawWait = data.getUint32(2);
    const coolDownSeconds = data.getInt16(6);
    const pxlCnt = data.byteLength >= 10 ? data.getUint8(8) : (rawWait <= 0 ? 1 : 0);

    const resolver = pendingPixelResolvers.values().next().value;
    if (resolver) {
      const key = pendingPixelResolvers.keys().next().value as string;
      if (key) pendingPixelResolvers.delete(key);

      const cooldownMs = coolDownSeconds * 1000;

      Logger.debug(`WS: retCode=${retCode} waitMs=${rawWait} cooldownMs=${cooldownMs} pxlCnt=${pxlCnt}`);

      const base = { waitMs: rawWait, cooldownMs, pixelsAvailable: pxlCnt, maxPixels: 0 };

      let success = false;
      let error = '';
      let captcha = false;

      switch (retCode) {
        case 0:
          success = true;
          break;
        case 1:
          error = 'Invalid canvas';
          break;
        case 2:
        case 3:
        case 4:
          error = 'Invalid coordinates';
          break;
        case 5:
          error = 'Invalid color';
          break;
        case 6:
          error = 'Not logged in';
          break;
        case 7:
          error = 'Pixel score too low';
          break;
        case 8:
          error = 'Protected pixel';
          break;
        case 9:
          error = 'Cooldown not expired';
          break;
        case 10:
          error = 'Captcha required';
          captcha = true;
          break;
        case 11:
          error = 'Proxy detected';
          break;
        case 14:
          error = 'Banned';
          break;
        default:
          error = `Unknown error code: ${retCode}`;
          break;
      }

      resolver({ success, ...base, ...(error && { error }), ...(captcha && { captcha }) });
    }
  }
}

export function hookWebSocketEarly(): void {
  hookWebSocketCreation();
}

export function initWebSocketHook(): void {
  setTimeout(() => {
    tryConnectWebSocket();
  }, 1500 + Math.random() * 500);
}

export function placePixelViaWebSocket(
  x: number,
  y: number,
  colorIndex: number,
  _canvasId: number
): Promise<PixelPlaceResult> {
  return new Promise((resolve) => {
    const canvas = getMainCanvas();
    if (!canvas) {
      resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: 'No canvas info' });
      return;
    }

    const ws = findSiteWebSocket();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: 'WebSocket not connected. Please refresh the page.' });
      return;
    }

    const canvasSize = canvas.size;
    const halfSize = canvasSize / 2;
    const absX = x + halfSize;
    const absY = y + halfSize;
    const i = Math.floor(absX / CHUNK_SIZE);
    const j = Math.floor(absY / CHUNK_SIZE);
    const localX = ((absX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((absY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const offset = localX + localY * CHUNK_SIZE;

    Logger.info(`Place: world(${x},${y}) abs(${absX},${absY}) chunk(${i},${j}) local(${localX},${localY}) offset=${offset} color=${colorIndex} canvasSize=${canvasSize}`);

    const buffer = new ArrayBuffer(1 + 1 + 1 + 4);
    const view = new DataView(buffer);
    view.setUint8(0, PIXEL_UPDATE_OP);
    view.setUint8(1, i);
    view.setUint8(2, j);
    let pos = buffer.byteLength;
    view.setUint8(pos -= 1, colorIndex);
    view.setUint16(pos -= 2, offset & 0x00FFFF);
    view.setUint8(pos -= 1, offset >>> 16);

    const requestId = `${Date.now()}_${Math.random()}`;

    const timeout = setTimeout(() => {
      if (pendingPixelResolvers.has(requestId)) {
        pendingPixelResolvers.delete(requestId);
        recordPlacedPixel({ x, y, color: colorIndex, time: Date.now(), success: false, error: 'Timeout' });
        resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: 'Timeout waiting for response' });
      }
    }, 20000);

    pendingPixelResolvers.set(requestId, (result) => {
      clearTimeout(timeout);
      recordPlacedPixel({ x, y, color: colorIndex, time: Date.now(), success: result.success, error: result.error });
      resolve(result);
    });

    try {
      ws.send(buffer);
    } catch (err) {
      pendingPixelResolvers.delete(requestId);
      clearTimeout(timeout);
      recordPlacedPixel({ x, y, color: colorIndex, time: Date.now(), success: false, error: `Send: ${err}` });
      resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: `Send error: ${err}` });
    }
  });
}

export function getExistingWebSocket(): WebSocket | null {
  return findSiteWebSocket();
}
