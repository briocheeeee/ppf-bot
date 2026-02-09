export const STYLES = `
#ppf-bot-panel {
  --bg-window: #0e1015;
  --bg-window-gradient: linear-gradient(160deg, #151820 0%, #0c0e14 50%, #0e1018 100%);
  --bg-panel: rgba(18, 20, 28, 0.72);
  --bg-panel-solid: #12141c;
  --bg-input: rgba(8, 10, 16, 0.55);
  --bg-topbar: rgba(12, 14, 20, 0.88);
  --bg-btn: rgba(26, 30, 40, 0.65);
  --bg-btn-hover: rgba(36, 40, 52, 0.78);
  --bg-tab-track: rgba(14, 16, 22, 0.5);
  --border-window: rgba(70, 80, 105, 0.22);
  --border-panel: rgba(55, 62, 80, 0.18);
  --border-input: rgba(55, 62, 80, 0.28);
  --border-focus: rgba(120, 150, 200, 0.45);
  --accent: #7b9ec7;
  --accent-soft: rgba(123, 158, 199, 0.13);
  --accent-hover: #9ab5d6;
  --accent-glow: rgba(123, 158, 199, 0.08);
  --success: #5fa87a;
  --success-soft: rgba(95, 168, 122, 0.1);
  --success-hover: #78c092;
  --danger: #b86868;
  --danger-soft: rgba(184, 104, 104, 0.1);
  --danger-hover: #d08080;
  --warning: #c49a4a;
  --text-primary: #bfc5d0;
  --text-secondary: #6e7686;
  --text-muted: #414858;
  --radius-window: 14px;
  --radius-panel: 10px;
  --radius-control: 7px;
  --radius-pill: 16px;
  --radius-icon: 8px;
  --blur: 16px;
  --shadow-window: 0 12px 48px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  --shadow-panel: 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.02);
  --shadow-btn: 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  --font: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace;
  --transition: 0.18s cubic-bezier(0.4, 0, 0.2, 1);

  pointer-events: auto;
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 420px;
  max-width: 85vw;
  width: auto;
  background: var(--bg-window-gradient);
  border: 1px solid var(--border-window);
  border-radius: var(--radius-window);
  font-family: var(--font);
  font-size: 11px;
  color: var(--text-primary);
  z-index: 99999;
  user-select: none;
  resize: both;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-window);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media (max-width: 768px) {
  #ppf-bot-panel {
    min-width: 95vw;
    max-width: 95vw;
    bottom: 5px;
    font-size: 10px;
    --radius-window: 10px;
  }
}

#ppf-bot-panel * {
  box-sizing: border-box;
}

.ppf-titlebar {
  background: var(--bg-topbar);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  color: var(--text-secondary);
  padding: 5px 10px;
  font-size: 11px;
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-panel);
  gap: 6px;
  min-height: 36px;
}

.ppf-titlebar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ppf-titlebar-text {
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--text-secondary);
  font-size: 12px;
  display: none;
}

.ppf-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(22, 26, 36, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(60, 68, 88, 0.2);
  border-radius: var(--radius-pill);
  padding: 3px 10px 3px 5px;
  cursor: default;
  transition: border-color var(--transition), box-shadow var(--transition);
  flex-shrink: 0;
}

.ppf-status-pill:hover {
  border-color: rgba(70, 80, 100, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.ppf-status-pill-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  padding: 3px;
  position: relative;
}

.ppf-status-pill-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}

.ppf-status-pill-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  gap: 1px;
}

.ppf-status-pill-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

.ppf-status-pill-sub {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  color: var(--text-muted);
  letter-spacing: 0.1px;
}

.ppf-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.ppf-status-dot.ppf-dot-idle {
  background: var(--text-muted);
}

.ppf-status-dot.ppf-dot-running {
  background: var(--success);
  box-shadow: 0 0 6px rgba(95, 168, 122, 0.5);
  animation: ppf-dot-pulse 1.5s ease-in-out infinite;
}

.ppf-status-dot.ppf-dot-stopped {
  background: var(--danger);
}

.ppf-status-dot.ppf-dot-paused {
  background: var(--warning);
}

.ppf-status-dot.ppf-dot-captcha {
  background: var(--danger);
  box-shadow: 0 0 6px rgba(184, 104, 104, 0.5);
  animation: ppf-blink 0.6s ease-in-out infinite;
}

.ppf-status-dot.ppf-dot-cooldown {
  background: var(--accent);
  box-shadow: 0 0 4px rgba(123, 158, 199, 0.4);
}

@keyframes ppf-dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.ppf-titlebar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ppf-minimize-btn {
  width: 26px;
  height: 26px;
  background: var(--bg-btn);
  border: 1px solid var(--border-panel);
  border-radius: var(--radius-icon);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  transition: all var(--transition);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.ppf-minimize-btn svg {
  width: 12px;
  height: 12px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--transition);
}

.ppf-minimize-btn:hover {
  color: var(--text-primary);
  background: var(--bg-btn-hover);
  border-color: rgba(70, 80, 100, 0.3);
}

.ppf-minimize-btn:hover svg {
  transform: translateY(1px);
}

.ppf-minimize-btn:active {
  transform: scale(0.94);
}

.ppf-minimize-btn.ppf-minimized svg {
  transform: rotate(180deg);
}

.ppf-tabs {
  display: flex;
  background: var(--bg-tab-track);
  padding: 3px;
  gap: 2px;
  margin: 6px 10px 0;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(55, 62, 80, 0.1);
}

.ppf-tab {
  flex: 1;
  padding: 4px 12px;
  text-align: center;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  color: var(--text-muted);
  border: 1px solid transparent;
  border-radius: calc(var(--radius-pill) - 2px);
  transition: all var(--transition);
  font-weight: 600;
  background: transparent;
}

.ppf-tab:hover {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.03);
}

.ppf-tab.ppf-tab-active {
  background: var(--bg-panel);
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  color: var(--text-primary);
  border-color: var(--border-panel);
  box-shadow: var(--shadow-panel);
}

.ppf-content {
  padding: 6px 8px 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: flex-start;
}

.ppf-content::-webkit-scrollbar {
  width: 4px;
}

.ppf-content::-webkit-scrollbar-track {
  background: transparent;
}

.ppf-content::-webkit-scrollbar-thumb {
  background: rgba(70, 80, 100, 0.25);
  border-radius: 4px;
}

.ppf-content::-webkit-scrollbar-thumb:hover {
  background: rgba(70, 80, 100, 0.45);
}

.ppf-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(70, 80, 100, 0.25) transparent;
}

@media (max-width: 768px) {
  .ppf-content {
    flex-direction: column;
    padding: 4px 6px 6px;
  }

  .ppf-content::-webkit-scrollbar {
    width: 3px;
  }
}

.ppf-tab-content {
  display: none;
  width: 100%;
}

.ppf-tab-content.ppf-tab-content-active {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ppf-section {
  flex: 1 1 auto;
  min-width: 160px;
  margin-bottom: 0;
  background: var(--bg-panel);
  backdrop-filter: blur(var(--blur)) saturate(1.1);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(1.1);
  border: 1px solid var(--border-panel);
  border-radius: var(--radius-panel);
  padding: 7px 9px;
  box-shadow: var(--shadow-panel);
  transition: border-color var(--transition);
}

.ppf-section:hover {
  border-color: rgba(60, 68, 85, 0.28);
}

@media (max-width: 768px) {
  .ppf-section {
    min-width: 100%;
  }
}

.ppf-section-header {
  font-size: 9px;
  color: var(--text-muted);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  transition: color var(--transition);
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(55, 62, 80, 0.12);
}

.ppf-section-header:hover {
  color: var(--text-secondary);
}

.ppf-section-icon {
  width: 12px;
  height: 12px;
  opacity: 0.55;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ppf-section-icon svg {
  width: 10px;
  height: 10px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ppf-section-arrow {
  width: 10px;
  height: 10px;
  margin-left: auto;
  opacity: 0.4;
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ppf-section-arrow svg {
  width: 10px;
  height: 10px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ppf-section-arrow.collapsed {
  transform: rotate(-90deg);
}

.ppf-section-content {
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
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
  width: 52px;
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.ppf-input {
  flex: 1;
  height: 28px;
  border: 1px solid var(--border-input);
  border-radius: var(--radius-control);
  background: var(--bg-input);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 0 8px;
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
}

.ppf-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-glow);
  background: rgba(10, 12, 20, 0.7);
}

.ppf-input:hover:not(:focus) {
  border-color: rgba(70, 80, 100, 0.38);
}

.ppf-input::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.ppf-select {
  flex: 1;
  height: 28px;
  border: 1px solid var(--border-input);
  border-radius: var(--radius-control);
  background: var(--bg-input);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: var(--font);
  font-size: 10px;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  padding: 0 24px 0 8px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%236e7686' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 8px 5px;
  transition: border-color var(--transition), box-shadow var(--transition), background-color var(--transition);
}

.ppf-select:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-glow);
  background-color: rgba(10, 12, 20, 0.7);
}

.ppf-select:hover:not(:focus) {
  border-color: rgba(70, 80, 100, 0.38);
}

.ppf-select option {
  background: #14161e;
  color: var(--text-primary);
}

.ppf-checkbox-row {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 6px;
  transition: background var(--transition);
}

.ppf-checkbox-row:hover {
  background: rgba(255, 255, 255, 0.025);
}

.ppf-checkbox-row:hover .ppf-checkbox-label {
  color: var(--text-primary);
}

.ppf-checkbox {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--border-input);
  border-radius: 4px;
  background: var(--bg-input);
  margin-right: 6px;
  cursor: pointer;
  position: relative;
  transition: all var(--transition);
  flex-shrink: 0;
}

.ppf-checkbox:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.ppf-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 3.5px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

.ppf-checkbox:hover {
  border-color: rgba(100, 110, 130, 0.5);
}

.ppf-checkbox:focus {
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.ppf-checkbox-label {
  font-size: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color var(--transition);
}

.ppf-file-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ppf-file-btn {
  height: 28px;
  padding: 0 10px;
  background: var(--bg-btn);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border-panel);
  border-radius: var(--radius-control);
  font-family: var(--font);
  font-size: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition);
  font-weight: 500;
  box-shadow: var(--shadow-btn);
}

.ppf-file-btn:hover {
  background: var(--bg-btn-hover);
  border-color: rgba(70, 80, 100, 0.3);
  color: var(--text-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.ppf-file-btn:active {
  transform: scale(0.96);
  box-shadow: none;
}

.ppf-file-name {
  flex: 1;
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

.ppf-buttons {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  width: 100%;
}

.ppf-btn {
  flex: 1;
  height: 30px;
  background: var(--bg-btn);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border-panel);
  border-radius: var(--radius-control);
  font-family: var(--font);
  font-size: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition);
  font-weight: 500;
  box-shadow: var(--shadow-btn);
  letter-spacing: 0.2px;
}

.ppf-btn:hover {
  background: var(--bg-btn-hover);
  border-color: rgba(70, 80, 100, 0.3);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.ppf-btn:active {
  transform: scale(0.96);
  box-shadow: none;
}

.ppf-btn:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
  background: rgba(18, 20, 28, 0.35);
  border-color: rgba(55, 62, 80, 0.08);
  opacity: 0.45;
  transform: none;
  box-shadow: none;
}

.ppf-btn-start {
  background: var(--success-soft);
  border-color: rgba(95, 168, 122, 0.2);
  color: var(--success);
}

.ppf-btn-start:hover {
  background: rgba(95, 168, 122, 0.18);
  border-color: rgba(95, 168, 122, 0.35);
  color: var(--success-hover);
  box-shadow: 0 2px 10px rgba(95, 168, 122, 0.12);
}

.ppf-btn-start:active {
  background: rgba(95, 168, 122, 0.14);
}

.ppf-btn-start:disabled {
  background: rgba(95, 168, 122, 0.04);
  border-color: rgba(95, 168, 122, 0.08);
  color: rgba(95, 168, 122, 0.25);
}

.ppf-btn-stop {
  background: var(--danger-soft);
  border-color: rgba(184, 104, 104, 0.2);
  color: var(--danger);
}

.ppf-btn-stop:hover {
  background: rgba(184, 104, 104, 0.18);
  border-color: rgba(184, 104, 104, 0.35);
  color: var(--danger-hover);
  box-shadow: 0 2px 10px rgba(184, 104, 104, 0.12);
}

.ppf-btn-stop:active {
  background: rgba(184, 104, 104, 0.14);
}

.ppf-btn-stop:disabled {
  background: rgba(184, 104, 104, 0.04);
  border-color: rgba(184, 104, 104, 0.08);
  color: rgba(184, 104, 104, 0.25);
}

.ppf-btn-icon {
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-icon);
}

.ppf-status-section {
  width: 100%;
  background: var(--bg-panel);
  backdrop-filter: blur(var(--blur)) saturate(1.1);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(1.1);
  border: 1px solid var(--border-panel);
  border-radius: var(--radius-panel);
  padding: 0;
  margin-top: 6px;
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}

.ppf-status-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text-muted);
  border-bottom: 1px solid rgba(55, 62, 80, 0.1);
}

.ppf-status-header .ppf-section-icon {
  width: 12px;
  height: 12px;
}

.ppf-status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.ppf-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 9px;
  font-size: 10px;
  border-bottom: 1px solid rgba(55, 62, 80, 0.07);
  transition: background var(--transition);
}

.ppf-status-row:hover {
  background: rgba(255, 255, 255, 0.015);
}

.ppf-status-row:last-child {
  border-bottom: none;
}

.ppf-status-label {
  color: var(--text-muted);
  text-transform: capitalize;
  letter-spacing: 0.2px;
  font-weight: 500;
  font-size: 9px;
}

.ppf-status-value {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 9px;
}

.ppf-status-idle { color: var(--text-muted); }
.ppf-status-running { color: var(--success); animation: ppf-pulse 2s ease-in-out infinite; }
.ppf-status-stopped { color: var(--danger); }
.ppf-status-paused { color: var(--warning); }
.ppf-status-captcha { color: #c46868; font-weight: 600; animation: ppf-blink 0.6s ease-in-out infinite; }
.ppf-status-cooldown { color: var(--accent); }

@keyframes ppf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

@keyframes ppf-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

.ppf-progress-bar {
  width: 100%;
  height: 2px;
  background: rgba(55, 62, 80, 0.12);
  border-radius: 0;
  overflow: hidden;
}

.ppf-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  transition: width 0.35s ease;
  position: relative;
}

.ppf-progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
  animation: ppf-shimmer 2s ease-in-out infinite;
}

@keyframes ppf-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.ppf-progress-fill.captcha {
  background: linear-gradient(90deg, var(--danger), var(--danger-hover));
}

.ppf-hidden {
  display: none !important;
}

.ppf-url-input {
  width: 100%;
  margin-top: 6px;
}

.ppf-preview {
  margin-top: 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-panel);
  border-radius: var(--radius-control);
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ppf-preview canvas {
  max-width: 100%;
  max-height: 50px;
}

.ppf-divider {
  height: 1px;
  background: rgba(55, 62, 80, 0.12);
  margin: 6px 0;
}

.ppf-small {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.5;
}

.ppf-small strong {
  color: var(--text-secondary);
  font-weight: 600;
}

.ppf-small a {
  color: var(--accent) !important;
  text-decoration: none;
  transition: color var(--transition);
}

.ppf-small a:hover {
  color: var(--accent-hover) !important;
  text-decoration: underline;
}

.ppf-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid rgba(55, 62, 80, 0.08);
}

.ppf-info-row:last-child {
  border-bottom: none;
}

.ppf-info-label {
  font-size: 9px;
  color: var(--text-muted);
  font-weight: 500;
}

.ppf-info-value {
  font-size: 9px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.ppf-info-value a {
  color: var(--accent) !important;
  text-decoration: none;
  font-family: var(--font);
  transition: color var(--transition);
}

.ppf-info-value a:hover {
  color: var(--accent-hover) !important;
  text-decoration: underline;
}

.ppf-kbd {
  display: inline-block;
  padding: 1px 6px;
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: rgba(30, 34, 44, 0.7);
  border: 1px solid rgba(55, 62, 80, 0.25);
  border-radius: 4px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
  line-height: 1.6;
}

.ppf-range {
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: rgba(55, 62, 80, 0.25);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.ppf-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.ppf-range::-webkit-slider-thumb:hover {
  background: var(--accent-hover);
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(123, 158, 199, 0.25);
}

.ppf-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
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

#ppf-bot-panel[data-theme="ppf"] {
  background: #fff;
  border: 1px solid #999;
  color: #333;
  border-radius: 8px;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-titlebar {
  background: linear-gradient(to bottom, #f0f0f0 0%, #d8d8d8 100%);
  color: #333;
  border-bottom: 1px solid #999;
  backdrop-filter: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-minimize-btn {
  border-color: #999;
  color: #333;
  background: #e8e8e8;
  border-radius: 4px;
  backdrop-filter: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-minimize-btn:hover {
  background: #d0d0d0;
  border-color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tabs {
  background: #f0f0f0;
  border: 1px solid #ccc;
  margin: 4px 8px 0;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tab {
  color: #666;
  background: transparent;
  border-radius: 16px;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tab:hover {
  background: #e8e8e8;
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-tab.ppf-tab-active {
  background: #fff;
  color: #333;
  border-color: #ccc;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-section {
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 6px;
  backdrop-filter: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-section-header {
  color: #666;
  border-bottom-color: #ddd;
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
  border-radius: 4px;
  backdrop-filter: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

#ppf-bot-panel[data-theme="ppf"] .ppf-select option {
  background: #fff;
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-input:focus,
#ppf-bot-panel[data-theme="ppf"] .ppf-select:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 2px rgba(74, 144, 226, 0.5);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-checkbox {
  background: #fff;
  border-color: #aaa;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-checkbox:checked {
  background: #4a90e2;
  border-color: #4a90e2;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-checkbox-label {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-checkbox-row {
  background: transparent;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-checkbox-row:hover .ppf-checkbox-label {
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-file-btn,
#ppf-bot-panel[data-theme="ppf"] .ppf-btn {
  background: linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%);
  border: 1px solid #999;
  color: #333;
  border-radius: 4px;
  backdrop-filter: none;
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
  border-radius: 6px;
  backdrop-filter: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-header {
  border-bottom-color: #ddd;
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-row {
  border-bottom-color: rgba(0,0,0,0.06);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-row:hover {
  background: rgba(0,0,0,0.02);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-label {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-value {
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-idle { color: #888; }
#ppf-bot-panel[data-theme="ppf"] .ppf-status-running { color: #2a9a5a; }
#ppf-bot-panel[data-theme="ppf"] .ppf-status-stopped { color: #c85555; }
#ppf-bot-panel[data-theme="ppf"] .ppf-status-paused { color: #d89a3a; }
#ppf-bot-panel[data-theme="ppf"] .ppf-status-captcha { color: #e84444; }
#ppf-bot-panel[data-theme="ppf"] .ppf-status-cooldown { color: #4a90e2; }

#ppf-bot-panel[data-theme="ppf"] .ppf-progress-bar {
  background: #e0e0e0;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-progress-fill {
  background: linear-gradient(90deg, #4a90e2, #6aa8f0);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-progress-fill::after {
  display: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-preview {
  background: #f8f8f8;
  border: 1px solid #ccc;
  border-radius: 4px;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-divider {
  background: #ccc;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-small {
  color: #888;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-small strong {
  color: #444;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-small a {
  color: #4a90e2 !important;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-info-label {
  color: #666;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-info-value {
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-info-value a {
  color: #4a90e2 !important;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-info-row {
  border-bottom-color: rgba(0,0,0,0.06);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-kbd {
  background: #e8e8e8;
  border-color: #ccc;
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-pill {
  background: #e8e8e8;
  border-color: #ccc;
  backdrop-filter: none;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-pill-title {
  color: #333;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-pill-sub {
  color: #888;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-pill-icon {
  background: #d0e0f0;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-pill-icon svg path {
  fill: #4a90e2;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-dot {
  background: #888;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-dot.ppf-dot-running {
  background: #2a9a5a;
  box-shadow: 0 0 4px rgba(42, 154, 90, 0.4);
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-dot.ppf-dot-stopped {
  background: #c85555;
}

#ppf-bot-panel[data-theme="ppf"] .ppf-status-dot.ppf-dot-captcha {
  background: #e84444;
  box-shadow: 0 0 4px rgba(232, 68, 68, 0.4);
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
  width: 14px;
  height: 14px;
  background: transparent;
  z-index: 10;
  transition: background var(--transition);
  touch-action: none;
}

.ppf-resize-handle:hover {
  background: rgba(123, 158, 199, 0.12);
}

.ppf-resize-handle:active {
  background: rgba(123, 158, 199, 0.22);
}

.ppf-resize-handle.ppf-resize-tl {
  top: 0;
  left: 0;
  cursor: nwse-resize;
  border-top-left-radius: var(--radius-window);
}

.ppf-resize-handle.ppf-resize-tr {
  top: 0;
  right: 0;
  cursor: nesw-resize;
  border-top-right-radius: var(--radius-window);
}

.ppf-resize-handle.ppf-resize-bl {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
  border-bottom-left-radius: var(--radius-window);
}

.ppf-resize-handle.ppf-resize-br {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  border-bottom-right-radius: var(--radius-window);
}

@media (max-width: 768px) {
  .ppf-resize-handle {
    width: 16px;
    height: 16px;
  }

  .ppf-label {
    width: 44px;
    font-size: 9px;
  }

  .ppf-input, .ppf-select {
    font-size: 10px;
    height: 26px;
  }

  .ppf-btn {
    height: 28px;
    font-size: 10px;
  }

  .ppf-section {
    padding: 6px 8px;
  }

  .ppf-status-pill {
    padding: 2px 8px 2px 4px;
    gap: 4px;
  }

  .ppf-status-pill-icon {
    width: 18px;
    height: 18px;
  }

  .ppf-status-pill-icon svg {
    width: 12px;
    height: 12px;
  }

  .ppf-tabs {
    margin: 4px 6px 0;
  }
}
`;
