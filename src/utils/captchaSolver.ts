import { Logger } from './logger';

let originalTitle = '';
let captchaDetected = false;
let checkInterval: number | null = null;
let onCaptchaSolved: (() => void) | null = null;

export function initCaptchaDetector(onSolved: () => void): void {
  const host = window.location.hostname;
  if (!host.includes('pixmap') && !host.includes('pixelplanet') && !host.includes('pixunivers')) return;
  
  onCaptchaSolved = onSolved;
  originalTitle = document.title;
  
  checkInterval = window.setInterval(() => {
    const hasCaptcha = detectCaptcha();
    
    if (hasCaptcha && !captchaDetected) {
      captchaDetected = true;
      notifyUser();
      Logger.warn('[CAPTCHA] Captcha detected - waiting for user to solve');
    } else if (!hasCaptcha && captchaDetected) {
      captchaDetected = false;
      restoreTitle();
      Logger.info('[CAPTCHA] Captcha solved - resuming');
      if (onCaptchaSolved) onCaptchaSolved();
    }
  }, 1000);
}

function detectCaptcha(): boolean {
  const alertBox = document.querySelector('div.Alert.show');
  if (alertBox) {
    const h2 = alertBox.querySelector('h2');
    if (h2 && h2.textContent?.toLowerCase().includes('captcha')) {
      return true;
    }
  }
  
  const turnstile = document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare"]');
  if (turnstile) return true;
  
  const captchaContainer = document.querySelector('[class*="captcha"], [id*="captcha"]');
  if (captchaContainer) return true;
  
  return false;
}

function notifyUser(): void {
  document.title = '⚠️ SOLVE CAPTCHA! ⚠️';
  
  flashTitle();
  
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      showNotification();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification();
        }
      });
    }
  }
  
  if (document.hidden) {
    try {
      new Audio('data:audio/wav;base64,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').play();
    } catch {}
  }
}

function showNotification(): void {
  const notification = new Notification('PPF-Bot: Captcha Required', {
    body: 'Please solve the captcha to continue placing pixels',
    icon: 'https://pixmap.fun/favicon.ico',
    requireInteraction: true,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

let flashInterval: number | null = null;

function flashTitle(): void {
  if (flashInterval) return;
  
  let showWarning = true;
  flashInterval = window.setInterval(() => {
    if (!captchaDetected) {
      if (flashInterval) {
        clearInterval(flashInterval);
        flashInterval = null;
      }
      return;
    }
    document.title = showWarning ? '⚠️ SOLVE CAPTCHA! ⚠️' : originalTitle;
    showWarning = !showWarning;
  }, 1000);
}

function restoreTitle(): void {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
  document.title = originalTitle;
}

export function isCaptchaActive(): boolean {
  return captchaDetected;
}

export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function stopCaptchaDetector(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  restoreTitle();
}
