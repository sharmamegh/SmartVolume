import { AppState } from 'react-native';

export function subscribeToCaptureInterruption(cancel: () => void): () => void {
  const subscription = AppState.addEventListener('change', state => {
    if (state !== 'active') cancel();
  });
  return () => subscription.remove();
}
