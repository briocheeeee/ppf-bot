import type { MeResponse, CanvasInfo, ChunkCoord, PixelPlaceResult } from '../types';
import { Logger } from '../utils/logger';

declare const unsafeWindow: Window & typeof globalThis;

function getBaseUrl(): string {
  const host = window.location.hostname;
  if (host.includes('pixelplanet')) return 'https://pixelplanet.fun';
  return 'https://pixmap.fun';
}

const BASE_URL = getBaseUrl();
const CHUNK_SIZE_VAL = 256;

let cachedMe: MeResponse | null = null;
let cachedCanvas: CanvasInfo | null = null;
let cachedCanvasId: number = 0;
let chunkCache: Map<string, Uint8Array> = new Map();
let pixelWebSocket: WebSocket | null = null;
let pendingPixelResolvers: Map<string, (result: PixelPlaceResult) => void> = new Map();

export async function fetchMe(): Promise<MeResponse> {
  const response = await fetch(`${BASE_URL}/api/me`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch /api/me: ${response.status}`);
  }
  const data = await response.json();
  cachedMe = data;
  return data;
}

export function getCachedMe(): MeResponse | null {
  return cachedMe;
}

export function getMainCanvas(): CanvasInfo | null {
  if (cachedCanvas) return cachedCanvas;
  if (!cachedMe || !cachedMe.canvases) return null;
  const canvasIdStr = Object.keys(cachedMe.canvases)[0];
  if (canvasIdStr) {
    cachedCanvasId = parseInt(canvasIdStr, 10);
    cachedCanvas = cachedMe.canvases[canvasIdStr];
    Logger.info(`Selected canvas ID: ${cachedCanvasId}`);
    return cachedCanvas;
  }
  return null;
}

export function getCanvasId(): number {
  return cachedCanvasId;
}

export function getCanvasColors(): number[][] {
  const canvas = getMainCanvas();
  if (!canvas) return [];
  return canvas.colors;
}

export function pixelToChunk(x: number, y: number, canvasSize: number): ChunkCoord {
  const offset = canvasSize / 2;
  const cx = Math.floor((x + offset) / CHUNK_SIZE_VAL);
  const cy = Math.floor((y + offset) / CHUNK_SIZE_VAL);
  return { cx, cy };
}

export function getChunkKey(cx: number, cy: number): string {
  return `${cx}_${cy}`;
}

export async function fetchChunk(canvasId: number, cx: number, cy: number): Promise<Uint8Array | null> {
  const key = `${canvasId}_${cx}_${cy}`;
  if (chunkCache.has(key)) {
    return chunkCache.get(key)!;
  }

  const url = `${BASE_URL}/chunks/${canvasId}/${cx}/${cy}.bmp`;
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (response.status === 404) {
      const emptyChunk = new Uint8Array(CHUNK_SIZE_VAL * CHUNK_SIZE_VAL);
      chunkCache.set(key, emptyChunk);
      return emptyChunk;
    }
    if (!response.ok) {
      Logger.error(`Failed to fetch chunk ${cx},${cy}: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    chunkCache.set(key, data);
    return data;
  } catch (err) {
    Logger.error(`Error fetching chunk ${cx},${cy}:`, err);
    return null;
  }
}

export function getPixelFromChunk(
  chunkData: Uint8Array,
  x: number,
  y: number,
  canvasSize: number
): number {
  const offset = canvasSize / 2;
  const localX = ((x + offset) % CHUNK_SIZE_VAL + CHUNK_SIZE_VAL) % CHUNK_SIZE_VAL;
  const localY = ((y + offset) % CHUNK_SIZE_VAL + CHUNK_SIZE_VAL) % CHUNK_SIZE_VAL;
  const index = localY * CHUNK_SIZE_VAL + localX;
  return chunkData[index] || 0;
}

export async function getPixelColor(canvasId: number, x: number, y: number, canvasSize: number): Promise<number | null> {
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
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
  
  await Promise.all(chunkList.map(({ cx, cy }) => fetchChunk(canvasId, cx, cy)));
  
  const elapsed = Date.now() - startTime;
  Logger.info(`Prefetch complete in ${elapsed}ms`);
}

export function getPixelColorSync(
  canvasId: number,
  x: number,
  y: number,
  canvasSize: number
): number | null {
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  const key = `${canvasId}_${cx}_${cy}`;
  const chunkData = chunkCache.get(key);
  if (!chunkData) return null;
  return getPixelFromChunk(chunkData, x, y, canvasSize);
}

export async function batchCheckPixelColors(
  canvasId: number,
  pixels: { x: number; y: number; color: number }[],
  canvasSize: number
): Promise<{ index: number; needsUpdate: boolean }[]> {
  await prefetchChunksForPixels(canvasId, pixels, canvasSize);
  
  const results: { index: number; needsUpdate: boolean }[] = [];
  
  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    const currentColor = getPixelColorSync(canvasId, pixel.x, pixel.y, canvasSize);
    results.push({
      index: i,
      needsUpdate: currentColor !== pixel.color
    });
  }
  
  return results;
}

export function invalidateChunkCache(cx: number, cy: number, canvasId: number): void {
  const key = `${canvasId}_${cx}_${cy}`;
  chunkCache.delete(key);
}

export function clearChunkCache(): void {
  chunkCache.clear();
}

export function findClosestColorIndex(r: number, g: number, b: number, colors: number[][]): number {
  let minDist = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < colors.length; i++) {
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
  
  function checkValue(val: unknown, depth: number): void {
    if (depth > 3) return;
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
  
  const win = window as unknown as Record<string, unknown>;
  for (const key of Object.keys(win)) {
    try {
      checkValue(win[key], 0);
    } catch {}
  }
  
  return sockets;
}

let listenerAttached = false;

function setupWebSocketListener(ws: WebSocket): void {
  if (listenerAttached) return;
  listenerAttached = true;
  
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
  const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const OriginalWebSocket = targetWindow.WebSocket;
  
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
  (stealthyWebSocket as any).CONNECTING = OriginalWebSocket.CONNECTING;
  (stealthyWebSocket as any).OPEN = OriginalWebSocket.OPEN;
  (stealthyWebSocket as any).CLOSING = OriginalWebSocket.CLOSING;
  (stealthyWebSocket as any).CLOSED = OriginalWebSocket.CLOSED;
  
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
    configurable: true
  });
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
  
  if (opcode === 0xC3 && pendingPixelResolvers.size > 0) {
    const retCode = data.getInt8(1);
    const waitMs = data.getUint32(2, false);
    const cooldownMs = data.getInt16(6, false);
    
    const resolver = pendingPixelResolvers.values().next().value;
    if (resolver) {
      const key = pendingPixelResolvers.keys().next().value as string;
      if (key) pendingPixelResolvers.delete(key);
      
      Logger.debug(`Pixel response: retCode=${retCode} waitMs=${waitMs} cooldownMs=${cooldownMs}`);
      
      if (retCode === 0) {
        resolver({ success: true, waitMs, cooldownMs });
      } else if (retCode === 5) {
        if (waitMs > 0) {
          resolver({ success: false, waitMs, cooldownMs, error: 'Cooldown not expired' });
        } else {
          resolver({ success: false, waitMs, cooldownMs, error: 'Pixel already correct color' });
        }
      } else if (retCode === 9) {
        resolver({ success: false, waitMs, cooldownMs, error: 'Cooldown not expired' });
      } else if (retCode === 10) {
        resolver({ success: false, waitMs, cooldownMs, error: 'Captcha required', captcha: true });
      } else if (retCode === 1) {
        resolver({ success: false, waitMs, cooldownMs, error: 'Invalid canvas' });
      } else if (retCode === 2) {
        resolver({ success: false, waitMs, cooldownMs, error: 'Invalid coordinates' });
      } else if (retCode === 3) {
        resolver({ success: false, waitMs, cooldownMs, error: 'Invalid color' });
      } else if (retCode === 4) {
        resolver({ success: false, waitMs, cooldownMs, error: 'Protected pixel' });
      } else {
        resolver({ success: false, waitMs, cooldownMs, error: `Unknown error code: ${retCode}` });
      }
    }
  }
}

export function initWebSocketHook(): void {
  hookWebSocketCreation();
  
  setTimeout(() => {
    tryConnectWebSocket();
  }, 1500 + Math.random() * 500);
}

export type BrushSizeType = 1 | 3 | 5;

export function placePixelViaWebSocket(
  x: number,
  y: number,
  colorIndex: number,
  canvasId: number,
  brushSize: BrushSizeType = 1
): Promise<PixelPlaceResult> {
  return new Promise((resolve) => {
    const canvas = getMainCanvas();
    if (!canvas) {
      resolve({ success: false, waitMs: 0, cooldownMs: 0, error: 'No canvas info' });
      return;
    }

    const ws = findSiteWebSocket();
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ success: false, waitMs: 0, cooldownMs: 0, error: 'WebSocket not connected. Please refresh the page.' });
      return;
    }

    const canvasSize = canvas.size;
    const { cx, cy } = pixelToChunk(x, y, canvasSize);
    
    const halfSize = canvasSize / 2;
    const absX = x + halfSize;
    const absY = y + halfSize;
    const localX = absX % CHUNK_SIZE_VAL;
    const localY = absY % CHUNK_SIZE_VAL;
    const offset = localX + localY * CHUNK_SIZE_VAL;

    let opcode = 0xC1;
    if (brushSize === 3) opcode = 0xC2;
    else if (brushSize === 5) opcode = 0xC3;

    const buffer = new ArrayBuffer(1 + 1 + 1 + 4);
    const view = new DataView(buffer);
    view.setUint8(0, opcode);
    view.setUint8(1, cy);
    view.setUint8(2, cx);
    view.setUint8(3, offset >>> 16);
    view.setUint16(4, offset & 0x00FFFF, false);
    view.setUint8(6, colorIndex);

    const requestId = `${Date.now()}_${Math.random()}`;
    
    const timeout = setTimeout(() => {
      if (pendingPixelResolvers.has(requestId)) {
        pendingPixelResolvers.delete(requestId);
        resolve({ success: false, waitMs: 0, cooldownMs: 0, error: 'Timeout waiting for response' });
      }
    }, 10000);

    pendingPixelResolvers.set(requestId, (result) => {
      clearTimeout(timeout);
      if (result.success) {
        invalidateChunkCache(cx, cy, canvasId);
      }
      resolve(result);
    });

    try {
      ws.send(buffer);
    } catch (err) {
      pendingPixelResolvers.delete(requestId);
      clearTimeout(timeout);
      resolve({ success: false, waitMs: 0, cooldownMs: 0, error: `Send error: ${err}` });
    }
  });
}

export function connectToWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const existing = findSiteWebSocket();
    if (existing) {
      resolve(existing);
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 20;
    
    const interval = setInterval(() => {
      attempts++;
      const ws = findSiteWebSocket();
      if (ws) {
        clearInterval(interval);
        resolve(ws);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error('Could not find site WebSocket'));
      }
    }, 500);
  });
}

export function getExistingWebSocket(): WebSocket | null {
  return findSiteWebSocket();
}

export function getCurrentCooldown(): number {
  if (cachedMe && cachedMe.wait !== null && cachedMe.wait !== undefined) {
    return cachedMe.wait;
  }
  return 0;
}
