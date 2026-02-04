import { Panel } from './ui/panel';
import { Logger } from './utils/logger';
import { initWebSocketHook } from './api/pixmap';
import { requestNotificationPermission } from './utils/captchaSolver';
import { maskFingerprint } from './utils/antidetect';

function main(): void {
  Logger.info('PPF-Bot starting...');
  
  maskFingerprint();
  initWebSocketHook();
  
  const waitForPage = (): void => {
    if (document.readyState === 'complete') {
      setTimeout(() => {
        const panel = new Panel();
        panel.init();
        requestNotificationPermission();
        Logger.info('PPF-Bot initialized');
      }, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const panel = new Panel();
          panel.init();
          requestNotificationPermission();
          Logger.info('PPF-Bot initialized');
        }, 1000);
      });
    }
  };

  waitForPage();
}

main();
