import { webCapabilities, type PlatformCapabilities } from './capabilities';

export function getPlatformCapabilities(): PlatformCapabilities {
  return webCapabilities;
}
