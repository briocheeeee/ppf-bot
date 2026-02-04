import { Panel } from './ui/panel';
import { Logger } from './utils/logger';
import { initWebSocketHook } from './api/pixmap';
import { requestNotificationPermission } from './utils/captchaSolver';
import { initStealthMode } from './utils/antidetect';
import { interceptConsoleEarly, preventStackTraceDetection, blockDetectionAPIs } from './utils/consoleIntercept';

interceptConsoleEarly();
preventStackTraceDetection();
blockDetectionAPIs();

function main(): void {
  initStealthMode();
  initWebSocketHook();
  
  const waitForPage = (): void => {
    const initPanel = (): void => {
      setTimeout(() => {
        const panel = new Panel();
        panel.init();
        requestNotificationPermission();
        Logger.debug('Ready');
      }, 1500 + Math.random() * 500);
    };
    
    if (document.readyState === 'complete') {
      initPanel();
    } else {
      window.addEventListener('load', initPanel);
    }
  };

  waitForPage();
}

main();
