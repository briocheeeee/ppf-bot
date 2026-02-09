import type { PixelData, PlacementStrategy, BrushSize } from '../types';
import { findClosestColorIndex, getCanvasColors } from '../api/pixmap';
import { Logger } from '../utils/logger';

export interface ProcessedImage {
  width: number;
  height: number;
  pixels: PixelData[];
}


export function processImage(
  imageData: ImageData,
  startX: number,
  startY: number,
  strategy: PlacementStrategy,
  brushSize: BrushSize = '1x1'
): ProcessedImage {
  const colors = getCanvasColors();
  if (colors.length === 0) {
    Logger.error('No canvas colors available');
    return { width: 0, height: 0, pixels: [] };
  }

  const { width, height, data } = imageData;
  const pixels: PixelData[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 128) continue;

      const colorIndex = findClosestColorIndex(r, g, b, colors);
      pixels.push({
        x: startX + x,
        y: startY + y,
        color: colorIndex,
      });
    }
  }

  const sortedPixels = sortPixelsByStrategy(pixels, strategy, startX, startY, width, height);

  Logger.info(`Processed image: ${width}x${height}, ${sortedPixels.length} pixels (brush: ${brushSize})`);
  return { width, height, pixels: sortedPixels };
}


function sortPixelsByStrategy(
  pixels: PixelData[],
  strategy: PlacementStrategy,
  _startX: number,
  _startY: number,
  _width: number,
  _height: number
): PixelData[] {
  const sorted = [...pixels];

  switch (strategy) {
    case 'line-ltr':
      sorted.sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });
      break;

    case 'line-rtl':
      sorted.sort((a, b) => {
        if (a.x !== b.x) return b.x - a.x;
        return a.y - b.y;
      });
      break;

    case 'line-utb':
      sorted.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
      break;

    case 'line-btu':
      sorted.sort((a, b) => {
        if (a.y !== b.y) return b.y - a.y;
        return a.x - b.x;
      });
      break;

    case 'circle-in':
      sorted.sort((a, b) => {
        const centerX = _startX + _width / 2;
        const centerY = _startY + _height / 2;
        const distA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
        const distB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        return distA - distB;
      });
      break;

    case 'circle-out':
      sorted.sort((a, b) => {
        const centerX = _startX + _width / 2;
        const centerY = _startY + _height / 2;
        const distA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
        const distB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        return distB - distA;
      });
      break;

    case 'diagonal-tl':
      sorted.sort((a, b) => {
        const sumA = (a.x - _startX) + (a.y - _startY);
        const sumB = (b.x - _startX) + (b.y - _startY);
        if (sumA !== sumB) return sumA - sumB;
        return a.x - b.x;
      });
      break;

    case 'diagonal-tr':
      sorted.sort((a, b) => {
        const sumA = (_startX + _width - a.x) + (a.y - _startY);
        const sumB = (_startX + _width - b.x) + (b.y - _startY);
        if (sumA !== sumB) return sumA - sumB;
        return b.x - a.x;
      });
      break;

    case 'diagonal-bl':
      sorted.sort((a, b) => {
        const sumA = (a.x - _startX) + (_startY + _height - a.y);
        const sumB = (b.x - _startX) + (_startY + _height - b.y);
        if (sumA !== sumB) return sumA - sumB;
        return a.x - b.x;
      });
      break;

    case 'diagonal-br':
      sorted.sort((a, b) => {
        const sumA = (_startX + _width - a.x) + (_startY + _height - a.y);
        const sumB = (_startX + _width - b.x) + (_startY + _height - b.y);
        if (sumA !== sumB) return sumA - sumB;
        return b.x - a.x;
      });
      break;

    case 'spiral-in': {
      const spInCx = _startX + _width / 2;
      const spInCy = _startY + _height / 2;
      const spInMaxR = Math.sqrt((_width / 2) ** 2 + (_height / 2) ** 2) || 1;
      sorted.sort((a, b) => {
        const dA = Math.sqrt((a.x - spInCx) ** 2 + (a.y - spInCy) ** 2);
        const dB = Math.sqrt((b.x - spInCx) ** 2 + (b.y - spInCy) ** 2);
        const tA = Math.atan2(a.y - spInCy, a.x - spInCx);
        const tB = Math.atan2(b.y - spInCy, b.x - spInCx);
        const turnsA = (1 - dA / spInMaxR);
        const turnsB = (1 - dB / spInMaxR);
        const sA = turnsA * Math.PI * 2 + tA;
        const sB = turnsB * Math.PI * 2 + tB;
        return sB - sA;
      });
      break;
    }

    case 'spiral-out': {
      const spOutCx = _startX + _width / 2;
      const spOutCy = _startY + _height / 2;
      const spOutMaxR = Math.sqrt((_width / 2) ** 2 + (_height / 2) ** 2) || 1;
      sorted.sort((a, b) => {
        const dA = Math.sqrt((a.x - spOutCx) ** 2 + (a.y - spOutCy) ** 2);
        const dB = Math.sqrt((b.x - spOutCx) ** 2 + (b.y - spOutCy) ** 2);
        const tA = Math.atan2(a.y - spOutCy, a.x - spOutCx);
        const tB = Math.atan2(b.y - spOutCy, b.x - spOutCx);
        const turnsA = dA / spOutMaxR;
        const turnsB = dB / spOutMaxR;
        const sA = turnsA * Math.PI * 2 + tA;
        const sB = turnsB * Math.PI * 2 + tB;
        return sA - sB;
      });
      break;
    }

    case 'random':
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
      break;

    case 'edges-first':
      sorted.sort((a, b) => {
        const isEdgeA = a.x === _startX || a.x === _startX + _width - 1 || 
                        a.y === _startY || a.y === _startY + _height - 1;
        const isEdgeB = b.x === _startX || b.x === _startX + _width - 1 || 
                        b.y === _startY || b.y === _startY + _height - 1;
        if (isEdgeA && !isEdgeB) return -1;
        if (!isEdgeA && isEdgeB) return 1;
        return a.y !== b.y ? a.y - b.y : a.x - b.x;
      });
      break;

    case 'center-out':
      sorted.sort((a, b) => {
        const centerX = _startX + _width / 2;
        const centerY = _startY + _height / 2;
        const distA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
        const distB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        return distA - distB;
      });
      break;

    case 'checkerboard':
      const evenPixels: PixelData[] = [];
      const oddPixels: PixelData[] = [];
      sorted.forEach(p => {
        if ((p.x + p.y) % 2 === 0) {
          evenPixels.push(p);
        } else {
          oddPixels.push(p);
        }
      });
      evenPixels.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
      oddPixels.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
      return [...evenPixels, ...oddPixels];

    case 'scatter':
      const scatterResult: PixelData[] = [];
      const scatterCopy = [...sorted];
      const gridSize = 8;
      const cells: Map<string, PixelData[]> = new Map();
      
      scatterCopy.forEach(p => {
        const cellKey = `${Math.floor(p.x / gridSize)}_${Math.floor(p.y / gridSize)}`;
        if (!cells.has(cellKey)) cells.set(cellKey, []);
        cells.get(cellKey)!.push(p);
      });
      
      const cellKeys = Array.from(cells.keys());
      for (let i = cellKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellKeys[i], cellKeys[j]] = [cellKeys[j], cellKeys[i]];
      }
      
      cellKeys.forEach(key => {
        const cellPixels = cells.get(key)!;
        for (let i = cellPixels.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cellPixels[i], cellPixels[j]] = [cellPixels[j], cellPixels[i]];
        }
        scatterResult.push(...cellPixels);
      });
      return scatterResult;

    case 'human': {
      const humanResult: PixelData[] = [];
      const humanCopy = [...sorted];
      const pixelLookup = new Map<string, number>();
      humanCopy.forEach((p, i) => pixelLookup.set(`${p.x},${p.y}`, i));
      const usedHuman = new Set<number>();

      const findNearestUnused = (fx: number, fy: number, maxRadius: number): number => {
        let bestIdx = -1;
        let bestDist = Infinity;
        const r = Math.ceil(maxRadius);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxRadius) continue;
            const idx = pixelLookup.get(`${fx + dx},${fy + dy}`);
            if (idx !== undefined && !usedHuman.has(idx) && dist < bestDist) {
              bestDist = dist;
              bestIdx = idx;
            }
          }
        }
        return bestIdx;
      };

      const pickRandomUnused = (): number => {
        const remaining: number[] = [];
        for (let i = 0; i < humanCopy.length; i++) {
          if (!usedHuman.has(i)) remaining.push(i);
        }
        if (remaining.length === 0) return -1;
        return remaining[Math.floor(Math.random() * remaining.length)];
      };

      let cursorX = 0;
      let cursorY = 0;
      let hasPosition = false;

      while (usedHuman.size < humanCopy.length) {
        let startIdx: number;
        if (hasPosition && Math.random() < 0.7) {
          const jumpRadius = 3 + Math.floor(Math.random() * 12);
          startIdx = findNearestUnused(cursorX, cursorY, jumpRadius);
          if (startIdx === -1) {
            startIdx = findNearestUnused(cursorX, cursorY, 50);
          }
          if (startIdx === -1) {
            startIdx = pickRandomUnused();
          }
        } else {
          startIdx = pickRandomUnused();
        }
        if (startIdx === -1) break;

        usedHuman.add(startIdx);
        humanResult.push(humanCopy[startIdx]);
        cursorX = humanCopy[startIdx].x;
        cursorY = humanCopy[startIdx].y;
        hasPosition = true;

        let angle = Math.random() * Math.PI * 2;
        const strokeLen = 5 + Math.floor(Math.random() * 25);
        const curvature = (Math.random() - 0.5) * 0.6;
        const speed = 1.2 + Math.random() * 1.8;

        let sx = cursorX;
        let sy = cursorY;
        let missStreak = 0;

        for (let s = 0; s < strokeLen; s++) {
          angle += curvature + (Math.random() - 0.5) * 0.4;
          sx += Math.cos(angle) * speed;
          sy += Math.sin(angle) * speed;

          const rx = Math.round(sx);
          const ry = Math.round(sy);

          const scanRadius = 2;
          let bestScanIdx = -1;
          let bestScanDist = Infinity;
          for (let sdy = -scanRadius; sdy <= scanRadius; sdy++) {
            for (let sdx = -scanRadius; sdx <= scanRadius; sdx++) {
              const idx = pixelLookup.get(`${rx + sdx},${ry + sdy}`);
              if (idx !== undefined && !usedHuman.has(idx)) {
                const d = Math.abs(sdx) + Math.abs(sdy);
                if (d < bestScanDist) {
                  bestScanDist = d;
                  bestScanIdx = idx;
                }
              }
            }
          }

          if (bestScanIdx !== -1) {
            usedHuman.add(bestScanIdx);
            humanResult.push(humanCopy[bestScanIdx]);
            cursorX = humanCopy[bestScanIdx].x;
            cursorY = humanCopy[bestScanIdx].y;
            missStreak = 0;
          } else {
            missStreak++;
            if (missStreak > 4) break;
          }
        }
      }
      return humanResult;
    }

    case 'wave':
      const waveCopy = [...sorted];
      const amplitude = Math.min(_width, _height) / 4;
      const frequency = 0.1;
      
      waveCopy.sort((a, b) => {
        const phaseA = a.x + Math.sin(a.y * frequency) * amplitude;
        const phaseB = b.x + Math.sin(b.y * frequency) * amplitude;
        return phaseA - phaseB;
      });
      return waveCopy;

    case 'cluster':
      const clusterResult: PixelData[] = [];
      const clusterCopy = [...sorted];
      const clusterSize = 16;
      const clusterMap: Map<string, PixelData[]> = new Map();
      
      clusterCopy.forEach(p => {
        const cx = Math.floor((p.x - _startX) / clusterSize);
        const cy = Math.floor((p.y - _startY) / clusterSize);
        const key = `${cx},${cy}`;
        if (!clusterMap.has(key)) clusterMap.set(key, []);
        clusterMap.get(key)!.push(p);
      });
      
      const clusterKeys = Array.from(clusterMap.keys());
      for (let i = clusterKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [clusterKeys[i], clusterKeys[j]] = [clusterKeys[j], clusterKeys[i]];
      }
      
      clusterKeys.forEach(key => {
        const pixels = clusterMap.get(key)!;
        pixels.sort((a, b) => {
          const distA = Math.sqrt(Math.pow(a.x - pixels[0].x, 2) + Math.pow(a.y - pixels[0].y, 2));
          const distB = Math.sqrt(Math.pow(b.x - pixels[0].x, 2) + Math.pow(b.y - pixels[0].y, 2));
          return distA - distB;
        });
        clusterResult.push(...pixels);
      });
      return clusterResult;

    case 'organic':
      const organicResult: PixelData[] = [];
      const organicCopy = [...sorted];
      const organicUsed = new Set<number>();
      const organicLookup = new Map<string, number>();
      organicCopy.forEach((p, i) => organicLookup.set(`${p.x},${p.y}`, i));
      
      let currentOrg = organicCopy[Math.floor(Math.random() * organicCopy.length)];
      
      while (organicUsed.size < organicCopy.length) {
        const currentKey = `${currentOrg.x},${currentOrg.y}`;
        const currentIdx = organicLookup.get(currentKey);
        
        if (currentIdx !== undefined && !organicUsed.has(currentIdx)) {
          organicUsed.add(currentIdx);
          organicResult.push(currentOrg);
        }
        
        let bestNext: PixelData | null = null;
        let bestDist = Infinity;
        const searchRadius = 5;
        
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nkey = `${currentOrg.x + dx},${currentOrg.y + dy}`;
            const nidx = organicLookup.get(nkey);
            if (nidx !== undefined && !organicUsed.has(nidx)) {
              const dist = Math.sqrt(dx * dx + dy * dy) + Math.random() * 2;
              if (dist < bestDist) {
                bestDist = dist;
                bestNext = organicCopy[nidx];
              }
            }
          }
        }
        
        if (bestNext) {
          currentOrg = bestNext;
        } else {
          for (let i = 0; i < organicCopy.length; i++) {
            if (!organicUsed.has(i)) {
              currentOrg = organicCopy[i];
              break;
            }
          }
        }
      }
      return organicResult;

    case 'snake':
      const snakeResult: PixelData[] = [];
      const snakeCopy = [...sorted];
      snakeCopy.sort((a, b) => a.y - b.y || a.x - b.x);
      
      const snakeRows: PixelData[][] = [];
      
      snakeCopy.forEach(p => {
        if (snakeRows.length === 0 || p.y !== snakeRows[snakeRows.length - 1][0]?.y) {
          snakeRows.push([]);
        }
        snakeRows[snakeRows.length - 1].push(p);
      });
      
      snakeRows.forEach((row, idx) => {
        if (idx % 2 === 1) row.reverse();
        snakeResult.push(...row);
      });
      return snakeResult;

    case 'zigzag':
      const zigzagResult: PixelData[] = [];
      const zigzagCopy = [...sorted];
      zigzagCopy.sort((a, b) => a.y - b.y || a.x - b.x);
      
      const zigzagRows: PixelData[][] = [];
      zigzagCopy.forEach(p => {
        if (zigzagRows.length === 0 || p.y !== zigzagRows[zigzagRows.length - 1][0]?.y) {
          zigzagRows.push([]);
        }
        zigzagRows[zigzagRows.length - 1].push(p);
      });
      
      let zigzagDir = 1;
      zigzagRows.forEach(row => {
        if (zigzagDir === -1) row.reverse();
        zigzagDir *= -1;
        
        for (let i = 0; i < row.length; i += 2) {
          zigzagResult.push(row[i]);
        }
        for (let i = 1; i < row.length; i += 2) {
          zigzagResult.push(row[i]);
        }
      });
      return zigzagResult;

    case 'text-draw':
      const visited = new Set<string>();
      const textResult: PixelData[] = [];
      
      const getKey = (x: number, y: number) => `${x},${y}`;
      const pixelMap = new Map<string, PixelData>();
      sorted.forEach(p => pixelMap.set(getKey(p.x, p.y), p));
      
      const getNeighbors = (x: number, y: number): PixelData[] => {
        const neighbors: PixelData[] = [];
        const dirs = [[0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1]];
        for (const [dx, dy] of dirs) {
          const key = getKey(x + dx, y + dy);
          if (pixelMap.has(key) && !visited.has(key)) {
            neighbors.push(pixelMap.get(key)!);
          }
        }
        return neighbors;
      };
      
      const floodFill = (startPixel: PixelData) => {
        const stack = [startPixel];
        while (stack.length > 0) {
          const current = stack.pop()!;
          const key = getKey(current.x, current.y);
          if (visited.has(key)) continue;
          visited.add(key);
          textResult.push(current);
          
          const neighbors = getNeighbors(current.x, current.y);
          neighbors.sort((a, b) => {
            const distA = Math.abs(a.y - current.y) + Math.abs(a.x - current.x);
            const distB = Math.abs(b.y - current.y) + Math.abs(b.x - current.x);
            return distA - distB;
          });
          stack.push(...neighbors);
        }
      };
      
      sorted.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
      
      for (const pixel of sorted) {
        const key = getKey(pixel.x, pixel.y);
        if (!visited.has(key)) {
          floodFill(pixel);
        }
      }
      
      return textResult;
  }

  return sorted;
}

export function loadImageFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function loadImageFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image from URL'));
    img.src = url;
  });
}
