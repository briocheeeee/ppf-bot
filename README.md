# PPF-Bot

A TamperMonkey/Violentmonkey script I built to automate pixel placement on pixmap.fun. Got tired of clicking manually so I made this.

## What it does

This bot lets you upload an image and automatically places pixels on the canvas. It handles cooldowns, detects captchas, and has a few different placement strategies depending on how you want to draw.

The UI is styled like a roblox cheat because why not. It's draggable and saves your settings between sessions.

## Getting started

You'll need Node.js 18 or newer installed.

Clone the repo and install dependencies:

```bash
npm install
```

Build the userscript:

```bash
npm run build
```

The output goes to `dist/ppf-bot.user.js`.

If you're developing, run `npm run dev` instead. This starts a dev server with hot reload so you don't have to rebuild every time.

## Installing the script

You need TamperMonkey installed in your browser first. Then either:

- Open `dist/ppf-bot.user.js` after building, copy the contents, and paste into a new TamperMonkey script
- Point TamperMonkey to the dev server URL if you're running in dev mode

## How to use it

Go to pixmap.fun and you'll see the bot panel in the top right. 

Load an image either from your computer or paste a URL. Set your starting coordinates in `x_y` format. Pick a placement strategy - left to right, right to left, top to bottom, or bottom to top.

Hit start and it'll begin placing pixels. The bot respects cooldowns and shows a countdown timer. If a captcha pops up, you can configure it to stop automatically.

There's also a follow mode if you want to sync with another bot endpoint, but you probably won't need that unless you're coordinating with others.

## How it works

The code is split into a few parts:

- `src/api/pixmap.ts` - handles WebSocket connection and chunk loading
- `src/bot/controller.ts` - main bot logic and state
- `src/bot/imageProcessor.ts` - loads images and processes pixels
- `src/ui/panel.ts` - the draggable UI panel
- `src/ui/styles.ts` - Roblox cheat styling
- `src/utils/` - logging and localStorage stuff

PixMap uses WebSockets for pixel placement (opcode 0xC1), not a REST API. Canvas chunks are loaded as BMPs from `/chunks/{canvasId}/{cx}/{cy}.bmp`.

## License

MIT - do whatever you want with it