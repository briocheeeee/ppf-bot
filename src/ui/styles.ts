export const STYLES = `
#ppf-bot-panel {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 600px;
  max-width: 90vw;
  width: auto;
  background: #1a1a1a;
  border: 1px solid #333;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  color: #ccc;
  z-index: 99999;
  user-select: none;
  resize: both;
  overflow: hidden;
}

@media (max-width: 768px) {
  #ppf-bot-panel {
    min-width: 95vw;
    max-width: 95vw;
    bottom: 5px;
    font-size: 10px;
  }
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
  max-height: 40vh;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ppf-content::-webkit-scrollbar {
  width: 6px;
}

.ppf-content::-webkit-scrollbar-track {
  background: #0a0a0a;
}

.ppf-content::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.ppf-content::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.ppf-content {
  scrollbar-width: thin;
  scrollbar-color: #333 #0a0a0a;
}

@media (max-width: 768px) {
  .ppf-content {
    flex-direction: column;
    max-height: 50vh;
  }
  
  .ppf-content::-webkit-scrollbar {
    width: 4px;
  }
}

.ppf-section {
  flex: 1 1 auto;
  min-width: 180px;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .ppf-section {
    min-width: 100%;
  }
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

.ppf-range {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: #333;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.ppf-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #5a5;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ppf-range::-webkit-slider-thumb:hover {
  background: #6b6;
}

.ppf-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #5a5;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-range {
  background: #ccc;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-range::-webkit-slider-thumb {
  background: #4a90e2;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-range::-webkit-slider-thumb:hover {
  background: #5aa0f2;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-range::-moz-range-thumb {
  background: #4a90e2;
}

.ppf-tabs {
  display: flex;
  background: #0a0a0a;
  border-bottom: 1px solid #333;
}

.ppf-tab {
  flex: 1;
  padding: 6px 12px;
  text-align: center;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  color: #555;
  border-right: 1px solid #333;
  transition: all 0.15s ease;
}

.ppf-tab:last-child {
  border-right: none;
}

.ppf-tab:hover {
  background: #1a1a1a;
  color: #777;
}

.ppf-tab.ppf-tab-active {
  background: #1a1a1a;
  color: #aaa;
  border-bottom: 2px solid #5a5;
}

.ppf-tab-content {
  display: none;
  width: 100%;
}

.ppf-tab-content.ppf-tab-content-active {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

#ppf-bot-panel[data-theme="ppf"] {
  background: #fff;
  border: 1px solid #999;
  color: #333;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-titlebar {
  background: linear-gradient(to bottom, #f0f0f0 0%, #d8d8d8 100%);
  color: #333;
  border-bottom: 1px solid #999;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-minimize-btn {
  border-color: #999;
  color: #333;
  background: #e8e8e8;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-minimize-btn:hover {
  background: #d0d0d0;
  border-color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tabs {
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tab {
  color: #666;
  border-right: 1px solid #ccc;
  background: #e8e8e8;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tab:hover {
  background: #f0f0f0;
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tab.ppf-tab-active {
  background: #fff;
  color: #333;
  border-bottom: 2px solid #4a90e2;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-section-header {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-section-header:hover {
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-label {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-input,
#ppf-bot-panel[data-theme="ppf"] .ppf-select {
  background: #fff;
  border: 1px solid #aaa;
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-input:focus,
#ppf-bot-panel[data-theme="ppf"] .ppf-select:focus {
  border-color: #4a90e2;
  outline: none;
  box-shadow: 0 0 2px rgba(74, 144, 226, 0.5);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-checkbox-label {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-checkbox-row:hover .ppf-checkbox-label {
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-file-btn,
#ppf-bot-panel[data-theme="ppf"] .ppf-btn {
  background: linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%);
  border: 1px solid #999;
  color: #333;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-file-btn:hover,
#ppf-bot-panel[data-theme="ppf"] .ppf-btn:hover {
  background: linear-gradient(to bottom, #fff 0%, #e8e8e8 100%);
  border-color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-file-btn:active,
#ppf-bot-panel[data-theme="ppf"] .ppf-btn:active {
  background: linear-gradient(to bottom, #d8d8d8 0%, #e8e8e8 100%);
  box-shadow: inset 1px 1px 2px rgba(0,0,0,0.2);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-btn:disabled {
  background: #f0f0f0;
  color: #aaa;
  border-color: #ccc;
  box-shadow: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-btn-start {
  background: linear-gradient(to bottom, #d0f0d8 0%, #a8d8b8 100%);
  border-color: #6ab888;
  color: #1a5a30;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-btn-start:hover {
  background: linear-gradient(to bottom, #d8f8e0 0%, #b8e0c8 100%);
  border-color: #5aa878;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-btn-stop {
  background: linear-gradient(to bottom, #f8d0d0 0%, #e8b0b0 100%);
  border-color: #c88888;
  color: #5a1a1a;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-btn-stop:hover {
  background: linear-gradient(to bottom, #ffd8d8 0%, #f0c0c0 100%);
  border-color: #b87878;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-file-name {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-section {
  background: #f8f8f8;
  border: 1px solid #ccc;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-label {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-value {
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-idle {
  color: #888;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-running {
  color: #2a9a5a;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-stopped {
  color: #c85555;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-paused {
  color: #d89a3a;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-captcha {
  color: #e84444;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-cooldown {
  color: #4a90e2;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-progress-bar {
  background: #e0e0e0;
  border: 1px solid #ccc;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-progress-fill {
  background: linear-gradient(90deg, #4a90e2, #6aa8f0);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-preview {
  background: #f8f8f8;
  border: 1px solid #ccc;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-divider {
  background: #ccc;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-small {
  color: #888;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-content::-webkit-scrollbar-track {
  background: #f0f0f0;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-content::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-content::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-content {
  scrollbar-color: #ccc #f0f0f0;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-resize-handle:hover {
  background: rgba(150, 150, 150, 0.3);
}

.ppf-resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: transparent;
  z-index: 10;
  transition: background 0.15s ease;
  touch-action: none;
}

.ppf-resize-handle:hover {
  background: rgba(85, 85, 85, 0.4);
}

.ppf-resize-handle:active {
  background: rgba(85, 85, 85, 0.6);
}

.ppf-resize-handle.ppf-resize-tl {
  top: 0;
  left: 0;
  cursor: nwse-resize;
  border-top-left-radius: 2px;
}

.ppf-resize-handle.ppf-resize-tr {
  top: 0;
  right: 0;
  cursor: nesw-resize;
  border-top-right-radius: 2px;
}

.ppf-resize-handle.ppf-resize-bl {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
  border-bottom-left-radius: 2px;
}

.ppf-resize-handle.ppf-resize-br {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  border-bottom-right-radius: 2px;
}

.ppf-buttons {
  width: 100%;
}

.ppf-status-section {
  width: 100%;
}

@media (max-width: 768px) {
  .ppf-resize-handle {
    width: 16px;
    height: 16px;
  }
  
  .ppf-label {
    width: 50px;
    font-size: 9px;
  }
  
  .ppf-input, .ppf-select {
    font-size: 10px;
    height: 24px;
  }
  
  .ppf-btn {
    height: 28px;
    font-size: 10px;
  }
}
`;
