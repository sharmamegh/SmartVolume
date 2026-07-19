import type { AudioCapture } from './webAudioCapture';
import { WebAudioCapture } from './webAudioCapture';

export function createAudioCapture(): AudioCapture {
  return new WebAudioCapture();
}
