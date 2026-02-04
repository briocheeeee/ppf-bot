export const STYLES = `
#ppf-bot-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 240px;
  background: #1a1a1a;
  border: 1px solid #333;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  color: #ccc;
  z-index: 99999;
  user-select: none;
}

#ppf-bot-panel * {
  box-sizing: border-box;
}

.ppf-titlebar {
  background: #111;
  color: #888;
  padding: 6px 8px;
  font-size: 11px;
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.ppf-titlebar-text {
  flex: 1;
  font-weight: normal;
}

.ppf-minimize-btn {
  width: 18px;
  height: 18px;
  background: none;
  border: 1px solid #444;
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  color: #666;
}

.ppf-minimize-btn:hover {
  color: #aaa;
  border-color: #666;
}

.ppf-content {
  padding: 8px;
  max-height: 70vh;
  overflow-y: auto;
}

.ppf-section {
  margin-bottom: 8px;
}

.ppf-section-header {
  font-size: 10px;
  color: #555;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ppf-section-header:hover {
  color: #777;
}

.ppf-section-arrow {
  font-size: 8px;
  transition: transform 0.15s ease;
}

.ppf-section-arrow.collapsed {
  transform: rotate(-90deg);
}

.ppf-section-content {
  overflow: hidden;
  transition: max-height 0.2s ease, opacity 0.15s ease;
  max-height: 500px;
  opacity: 1;
}

.ppf-section-content.collapsed {
  max-height: 0;
  opacity: 0;
}

.ppf-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.ppf-row:last-child {
  margin-bottom: 0;
}

.ppf-label {
  width: 55px;
  font-size: 10px;
  color: #666;
}

.ppf-input {
  flex: 1;
  height: 22px;
  border: 1px solid #333;
  background: #0a0a0a;
  font-family: inherit;
  font-size: 11px;
  padding: 0 6px;
  color: #ccc;
  outline: none;
}

.ppf-input:focus {
  border-color: #555;
}

.ppf-select {
  flex: 1;
  height: 22px;
  border: 1px solid #333;
  background: #0a0a0a;
  font-family: inherit;
  font-size: 11px;
  color: #ccc;
  outline: none;
  cursor: pointer;
}

.ppf-checkbox-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  cursor: pointer;
}

.ppf-checkbox-row:hover .ppf-checkbox-label {
  color: #aaa;
}

.ppf-checkbox {
  margin-right: 6px;
  cursor: pointer;
}

.ppf-checkbox-label {
  font-size: 11px;
  cursor: pointer;
  color: #777;
}

.ppf-file-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ppf-file-btn {
  height: 22px;
  padding: 0 8px;
  background: #222;
  border: 1px solid #444;
  font-family: inherit;
  font-size: 10px;
  cursor: pointer;
  color: #aaa;
}

.ppf-file-btn:hover {
  background: #2a2a2a;
  color: #ccc;
}

.ppf-file-name {
  flex: 1;
  font-size: 10px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ppf-buttons {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.ppf-btn {
  flex: 1;
  height: 26px;
  background: #222;
  border: 1px solid #444;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  color: #aaa;
}

.ppf-btn:hover {
  background: #2a2a2a;
  color: #ccc;
}

.ppf-btn:disabled {
  color: #444;
  cursor: not-allowed;
  background: #1a1a1a;
}

.ppf-btn-start {
  background: #1a2a1a;
  border-color: #2a4a2a;
  color: #6a6;
}

.ppf-btn-start:hover {
  background: #223a22;
}

.ppf-btn-stop {
  background: #2a1a1a;
  border-color: #4a2a2a;
  color: #a66;
}

.ppf-btn-stop:hover {
  background: #3a2222;
}

.ppf-status-section {
  background: #111;
  border: 1px solid #222;
  padding: 6px 8px;
  margin-top: 8px;
}

.ppf-status-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
  font-size: 10px;
}

.ppf-status-row:last-child {
  margin-bottom: 0;
}

.ppf-status-label {
  color: #555;
}

.ppf-status-value {
  color: #888;
}

.ppf-status-idle { color: #555; }
.ppf-status-running { color: #5a5; animation: ppf-pulse 2s infinite; }
.ppf-status-stopped { color: #a55; }
.ppf-status-paused { color: #a85; }
.ppf-status-captcha { color: #f55; font-weight: bold; animation: ppf-blink 0.5s infinite; }
.ppf-status-cooldown { color: #58a; }

@keyframes ppf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes ppf-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ppf-progress-bar {
  width: 100%;
  height: 4px;
  background: #222;
  margin-top: 6px;
  border-radius: 2px;
  overflow: hidden;
}

.ppf-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3a5, #5a7);
  transition: width 0.3s ease;
}

.ppf-progress-fill.captcha {
  background: linear-gradient(90deg, #a33, #c44);
}

.ppf-hidden {
  display: none !important;
}

.ppf-url-input {
  width: 100%;
  margin-top: 4px;
}

.ppf-preview {
  margin-top: 6px;
  background: #111;
  border: 1px solid #222;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ppf-preview canvas {
  max-width: 100%;
  max-height: 60px;
}

.ppf-divider {
  height: 1px;
  background: #222;
  margin: 8px 0;
}

.ppf-small {
  font-size: 9px;
  color: #444;
}
`;
