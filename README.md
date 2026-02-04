# PPF-Bot

TamperMonkey userscript bot for automated pixel placement on pixmap.fun.

## Features

- Automated pixel placement with configurable strategies
- Image import (file or URL)
- Multiple placement strategies: Line (LTR, RTL, UTB, BTU)
- Cooldown management with visual countdown
- Captcha detection with stop/pause options
- Follow bot mode (configurable endpoint)
- Draggable Windows XP-style UI panel
- Persistent state (coordinates, settings, panel position)
- Progress tracking with ETA

## Project Structure

```
ppf-bot/
├── src/
│   ├── api/
│   │   └── pixmap.ts       # PixMap API interactions (WebSocket, chunks)
│   ├── bot/
│   │   ├── controller.ts   # Main bot logic and state management
│   │   └── imageProcessor.ts # Image loading and pixel processing
│   ├── ui/
│   │   ├── panel.ts        # UI panel component
│   │   └── styles.ts       # Windows XP-style CSS
│   ├── utils/
│   │   ├── logger.ts       # Console logging utility
│   │   └── storage.ts      # LocalStorage persistence
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   └── main.ts             # Entry point
├── dist/
│   └── ppf-bot.user.js     # Built userscript (after build)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Prerequisites

- Node.js >= 18
- npm

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

The built userscript will be in `dist/ppf-bot.user.js`.

## Development

```bash
npm run dev
```

This starts Vite dev server with hot reload. The userscript will be served at the URL shown in the terminal.

## Install Userscript

1. Install TamperMonkey browser extension
2. After building, open `dist/ppf-bot.user.js`
3. Copy the content and create a new script in TamperMonkey
4. Or use the dev server URL during development

## Usage

1. Navigate to https://pixmap.fun/
2. The PPF-Bot panel appears in the top-right corner
3. Configure:
   - **Coordinates**: Starting position in `x_y` format
   - **Strategy**: Pixel placement order
   - **Stop on Captcha**: Stop bot when captcha appears
   - **Follow Bot**: Enable to follow another bot's commands
   - **Image**: Load image file or from URL
4. Click **Start** to begin placement
5. Click **Stop** to halt

## API Notes

PixMap.fun uses WebSocket for pixel placement, not REST API:
- Canvas data: `GET /chunks/{canvasId}/{cx}/{cy}.bmp`
- User info: `GET /api/me`
- Pixel placement: WebSocket binary protocol (opcode 0xC1)

## License

MIT

!!!!!!!!!!!!!!! BY CHATGPT !!!!!!!!!!!!!!!