import { Panel } from './ui/panel';
import { Logger } from './utils/logger';
import { initWebSocketHook } from './api/pixmap';
import { requestNotificationPermission, initCaptchaDetector } from './utils/captchaSolver';
import { initStealthMode } from './utils/antidetect';
import { interceptConsoleEarly, preventStackTraceDetection, blockDetectionAPIs } from './utils/consoleIntercept';

interceptConsoleEarly();
preventStackTraceDetection();
blockDetectionAPIs();

let initialized = false;

function main(): void {
  initStealthMode();
  initWebSocketHook();
  
  const initPanel = (): void => {
    if (initialized) return;
    initialized = true;
    setTimeout(() => {
      const existing = document.getElementById('ppf-bot-panel');
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
