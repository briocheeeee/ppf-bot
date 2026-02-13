export function setupHotkeys(
  onStart: () => void,
  onStop: () => void,
  onReset: () => void,
  onToggleMinimize?: () => void
): void {
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      const startBtn = document.getElementById('ppf-start-btn') as HTMLButtonElement;
      const stopBtn = document.getElementById('ppf-stop-btn') as HTMLButtonElement;

      if (startBtn && !startBtn.disabled) {
        onStart();
      } else if (stopBtn && !stopBtn.disabled) {
        onStop();
      }
    } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onReset();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      onStop();
    } else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && onToggleMinimize) {
      e.preventDefault();
      onToggleMinimize();
    }
  });
}
