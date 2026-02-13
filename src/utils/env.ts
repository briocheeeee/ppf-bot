declare const unsafeWindow: Window & typeof globalThis;

export function getTargetWindow(): Window & typeof globalThis {
  try {
    if (typeof unsafeWindow !== 'undefined') return unsafeWindow;
  } catch {}
  return window;
}
