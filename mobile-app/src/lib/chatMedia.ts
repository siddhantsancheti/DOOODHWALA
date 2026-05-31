import { buildApiUrl } from './queryClient';
import * as SecureStore from './storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface PickedMedia {
  uri: string;
  name: string;
  mimeType: string;
  /** 'image' for photos, 'file' for documents */
  kind: 'image' | 'file';
}

// Upload a local file to the server (Firebase Storage) and return its URL.
export async function uploadChatMedia(media: PickedMedia): Promise<string> {
  const token =
    (await SecureStore.getItemAsync('token')) ||
    (await SecureStore.getItemAsync('accessToken'));

  const form = new FormData();
  // React Native FormData file shape
  form.append('file', { uri: media.uri, name: media.name, type: media.mimeType } as any);

  const res = await fetch(buildApiUrl('/api/chat/upload'), {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}) ${txt}`);
  }
  const data = await res.json();
  return data.url as string;
}

// Open the camera and return the picked photo (or null if cancelled/denied).
export async function pickFromCamera(): Promise<PickedMedia | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Camera permission needed', 'Please allow camera access in Settings.');
    return null;
  }
  const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', kind: 'image' };
}

// Open the photo library and return the picked photo.
export async function pickFromGallery(): Promise<PickedMedia | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photos permission needed', 'Please allow photo access in Settings.');
    return null;
  }
  const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.fileName || `image-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', kind: 'image' };
}

// Open the document picker and return the picked file.
export async function pickDocument(): Promise<PickedMedia | null> {
  const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name || `file-${Date.now()}`, mimeType: a.mimeType || 'application/octet-stream', kind: 'file' };
}

// Get the current location as a shareable Google Maps link (no upload needed).
export async function getLocationLink(): Promise<string | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Location permission needed', 'Please allow location access in Settings.');
    return null;
  }
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
}
