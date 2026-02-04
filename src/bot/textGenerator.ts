export interface TextPixel {
  x: number;
  y: number;
  charIndex: number;
  strokeIndex: number;
  order: number;
}

export interface TextMask {
  width: number;
  height: number;
  pixels: TextPixel[];
}

const LETTER_STROKES: Record<string, number[][]> = {
  'A': [[0,4,0,1], [0,1,2,0], [2,0,4,1], [4,1,4,4], [1,2,3,2]],
  'B': [[0,0,0,4], [0,0,2,0], [2,0,3,1], [3,1,2,2], [0,2,2,2], [2,2,3,3], [3,3,2,4], [0,4,2,4]],
  'C': [[3,0,1,0], [1,0,0,1], [0,1,0,3], [0,3,1,4], [1,4,3,4]],
  'D': [[0,0,0,4], [0,0,2,0], [2,0,4,2], [4,2,2,4], [2,4,0,4]],
  'E': [[0,0,0,4], [0,0,3,0], [0,2,2,2], [0,4,3,4]],
  'F': [[0,0,0,4], [0,0,3,0], [0,2,2,2]],
  'G': [[3,0,1,0], [1,0,0,1], [0,1,0,3], [0,3,1,4], [1,4,3,4], [3,4,3,2], [3,2,2,2]],
  'H': [[0,0,0,4], [4,0,4,4], [0,2,4,2]],
  'I': [[1,0,3,0], [2,0,2,4], [1,4,3,4]],
  'J': [[1,0,3,0], [2,0,2,3], [2,3,1,4], [1,4,0,3]],
  'K': [[0,0,0,4], [3,0,0,2], [0,2,3,4]],
  'L': [[0,0,0,4], [0,4,3,4]],
  'M': [[0,4,0,0], [0,0,2,2], [2,2,4,0], [4,0,4,4]],
  'N': [[0,4,0,0], [0,0,4,4], [4,4,4,0]],
  'O': [[1,0,3,0], [3,0,4,1], [4,1,4,3], [4,3,3,4], [3,4,1,4], [1,4,0,3], [0,3,0,1], [0,1,1,0]],
  'P': [[0,0,0,4], [0,0,3,0], [3,0,4,1], [4,1,3,2], [3,2,0,2]],
  'Q': [[1,0,3,0], [3,0,4,1], [4,1,4,3], [4,3,3,4], [3,4,1,4], [1,4,0,3], [0,3,0,1], [0,1,1,0], [3,3,4,4]],
  'R': [[0,0,0,4], [0,0,3,0], [3,0,4,1], [4,1,3,2], [3,2,0,2], [2,2,4,4]],
  'S': [[3,0,1,0], [1,0,0,1], [0,1,1,2], [1,2,3,2], [3,2,4,3], [4,3,3,4], [3,4,1,4]],
  'T': [[0,0,4,0], [2,0,2,4]],
  'U': [[0,0,0,3], [0,3,1,4], [1,4,3,4], [3,4,4,3], [4,3,4,0]],
  'V': [[0,0,2,4], [2,4,4,0]],
  'W': [[0,0,1,4], [1,4,2,2], [2,2,3,4], [3,4,4,0]],
  'X': [[0,0,4,4], [4,0,0,4]],
  'Y': [[0,0,2,2], [4,0,2,2], [2,2,2,4]],
  'Z': [[0,0,4,0], [4,0,0,4], [0,4,4,4]],
  '0': [[1,0,3,0], [3,0,4,1], [4,1,4,3], [4,3,3,4], [3,4,1,4], [1,4,0,3], [0,3,0,1], [0,1,1,0]],
  '1': [[1,1,2,0], [2,0,2,4], [1,4,3,4]],
  '2': [[0,1,1,0], [1,0,3,0], [3,0,4,1], [4,1,3,2], [3,2,0,4], [0,4,4,4]],
  '3': [[0,0,3,0], [3,0,4,1], [4,1,3,2], [3,2,4,3], [4,3,3,4], [3,4,0,4], [1,2,3,2]],
  '4': [[0,0,0,2], [0,2,4,2], [3,0,3,4]],
  '5': [[4,0,0,0], [0,0,0,2], [0,2,3,2], [3,2,4,3], [4,3,3,4], [3,4,0,4]],
  '6': [[3,0,1,0], [1,0,0,1], [0,1,0,4], [0,4,3,4], [3,4,4,3], [4,3,3,2], [3,2,0,2]],
  '7': [[0,0,4,0], [4,0,2,4]],
  '8': [[1,0,3,0], [3,0,4,1], [4,1,3,2], [3,2,4,3], [4,3,3,4], [3,4,1,4], [1,4,0,3], [0,3,1,2], [1,2,0,1], [0,1,1,0], [1,2,3,2]],
  '9': [[4,2,0,2], [0,2,0,1], [0,1,1,0], [1,0,3,0], [3,0,4,1], [4,1,4,4]],
  ' ': [],
  '.': [[2,4,2,4]],
  ',': [[2,4,1,5]],
  '!': [[2,0,2,3], [2,4,2,4]],
  '?': [[1,0,3,0], [3,0,4,1], [4,1,3,2], [3,2,2,2], [2,2,2,3], [2,4,2,4]],
  '-': [[1,2,3,2]],
  '_': [[0,4,4,4]],
  ':': [[2,1,2,1], [2,3,2,3]],
  '/': [[4,0,0,4]],
};

function getStrokesForChar(char: string): number[][] {
  const upper = char.toUpperCase();
  return LETTER_STROKES[upper] || [];
}

function drawThickLine(x1: number, y1: number, x2: number, y2: number, thickness: number = 2): Array<{x: number, y: number}> {
  const points: Array<{x: number, y: number}> = [];
  const added = new Set<string>();
  
  const addPoint = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (!added.has(key)) {
      added.add(key);
      points.push({ x, y });
    }
  };
  
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1;
  let y = y1;

  while (true) {
    for (let tx = 0; tx < thickness; tx++) {
      for (let ty = 0; ty < thickness; ty++) {
        addPoint(x + tx, y + ty);
      }
    }
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return points;
}

export function generateTextMask(text: string, scale: number = 3): TextMask {
  const charWidth = 5 * scale + scale;
  const charHeight = 5 * scale;
  const slantAngle = 15;
  const slantRad = (slantAngle * Math.PI) / 180;
  const slantOffset = Math.tan(slantRad);
  
  const extraWidth = Math.ceil(charHeight * slantOffset) + 5;
  const width = text.length * charWidth + 10 + extraWidth;
  const height = charHeight + 10;
  
  const pixels: TextPixel[] = [];
  let cursorX = 5;
  let globalOrder = 0;
  
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    const char = text[charIndex];
    const strokes = getStrokesForChar(char);
    
    strokes.forEach((stroke, strokeIndex) => {
      const [x1, y1, x2, y2] = stroke;
      
      const baseY1 = 5 + y1 * scale;
      const baseY2 = 5 + y2 * scale;
      const slantX1 = Math.floor((charHeight - y1 * scale) * slantOffset);
      const slantX2 = Math.floor((charHeight - y2 * scale) * slantOffset);
      
      const points = drawThickLine(
        cursorX + x1 * scale + slantX1,
        baseY1,
        cursorX + x2 * scale + slantX2,
        baseY2,
        2
      );
      
      points.forEach(p => {
        pixels.push({
          x: p.x,
          y: p.y,
          charIndex,
          strokeIndex,
          order: globalOrder++,
        });
      });
    });
    
    cursorX += charWidth;
  }
  
  return { width, height, pixels };
}

export function generateTextImage(text: string): ImageData {
  const mask = generateTextMask(text);
  
  const canvas = document.createElement('canvas');
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, mask.width, mask.height);
  
  ctx.fillStyle = 'black';
  mask.pixels.forEach(p => {
    if (p.x >= 0 && p.x < mask.width && p.y >= 0 && p.y < mask.height) {
      ctx.fillRect(p.x, p.y, 1, 1);
    }
  });
  
  return ctx.getImageData(0, 0, mask.width, mask.height);
}
