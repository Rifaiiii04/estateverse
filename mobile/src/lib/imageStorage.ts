import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

// Persists a local picked image URI into the app documents directory if possible.
export async function persistImageUri(sourceUri: string): Promise<string> {
  if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
    return sourceUri;
  }
  try {
    const randomName = `prop_${Crypto.randomUUID()}.jpg`;
    const targetFile = new File(Paths.document, randomName);
    const sourceFile = new File(sourceUri);
    sourceFile.copy(targetFile);
    return targetFile.uri;
  } catch {
    return sourceUri;
  }
}
