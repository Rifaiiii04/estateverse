import { Alert } from 'react-native';

// showApiError exposes a recoverable server or connectivity error without claiming offline data is current.
export function showApiError(error: unknown) {
  Alert.alert('Tidak dapat memuat data', error instanceof Error ? error.message : 'Periksa koneksi ke backend lalu coba lagi.');
}
