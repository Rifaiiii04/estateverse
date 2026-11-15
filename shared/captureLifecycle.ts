// shouldInterruptCapture distinguishes an actual backgrounded recording from permission dialogs and startup transitions.
export function shouldInterruptCapture(recording: boolean, appState: string): boolean {
  return recording && appState === 'background';
}

interface AppStateSource {
  currentState: string | null | undefined;
  addEventListener: (event: 'change', listener: (state: string) => void) => { remove: () => void };
}

// waitForCaptureForeground lets permission dialogs settle before a session becomes eligible for interruption.
export function waitForCaptureForeground(source: AppStateSource, settleMs = 200, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    let stable: ReturnType<typeof setTimeout> | undefined;
    // finish releases both timers and the temporary state listener.
    const finish = (failure?: Error) => {
      clearTimeout(stable);
      clearTimeout(deadline);
      subscription.remove();
      if (failure) reject(failure); else resolve();
    };
    // changed waits for an uninterrupted active interval after returning from native permission UI.
    const changed = (state: string | null | undefined) => {
      clearTimeout(stable);
      if (state === 'active') stable = setTimeout(() => finish(), settleMs);
    };
    const subscription = source.addEventListener('change', changed);
    const deadline = setTimeout(() => finish(new Error('Buka aplikasi di layar depan lalu mulai ulang.')), timeoutMs);
    changed(source.currentState);
  });
}
