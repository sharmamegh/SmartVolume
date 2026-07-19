import { Share } from 'react-native';

export async function exportLocalData(json: string): Promise<void> {
  await Share.share({ title: 'SmartVolume local data', message: json });
}
