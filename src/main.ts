import { Panel } from './ui/panel';
import { Logger } from './utils/logger';
import { hookWebSocketEarly, initWebSocketHook } from './api/pixmap';
import { requestNotificationPermission, initCaptchaDetector } from './utils/captchaSolver';
import { initStealthMode } from './utils/antidetect';
import { interceptConsoleEarly, preventStackTraceDetection, blockDetectionAPIs } from './utils/consoleIntercept';

hookWebSocketEarly();

const isPixelya = window.location.hostname.includes('pixelya.fun');

if (!isPixelya) {
  interceptConsoleEarly();
  preventStackTraceDetection();
  blockDetectionAPIs();
}

let initialized = false;

function main(): void {
  if (!isPixelya) {
    initStealthMode();
  }
  initWebSocketHook();
  
  const initPanel = (): void => {
    if (initialized) return;
    initialized = true;
    setTimeout(() => {
      const existing = document.getElementById('ppf-bot-shadow-host');
      if (existing) existing.remove();
      const panel = new Panel();
      panel.init();
      requestNotificationPermission();
      initCaptchaDetector(() => {
        Logger.info('Captcha resolved via DOM detector');
      });
      Logger.debug('Ready');
    }, 1500 + Math.random() * 500);
  };
  
  if (document.readyState === 'complete') {
    initPanel();
  } else {
    window.addEventListener('load', initPanel, { once: true });
  }
}

main();
