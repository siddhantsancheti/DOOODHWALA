import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { API_BASE_URL, ensureApiBaseUrl } from "./queryClient";
import * as SecureStore from "./storage";

/**
 * Take or choose a photo of a PAN card and upload it.
 *
 * Sent as multipart to a KYC-only endpoint rather than through the chat
 * uploader: chat attachments get a signed URL that never expires, which is
 * fine for a photo of a milk crate and wrong for someone's PAN card. The
 * server stores only the path and mints a short-lived link when it is actually
 * needed.
 */
export async function pickAndUploadPan(source: "camera" | "library"): Promise<boolean> {
    try {
        const perm = source === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!perm.granted) {
            Alert.alert(
                "Permission needed",
                source === "camera"
                    ? "Allow camera access to photograph your PAN card."
                    : "Allow photo access to choose your PAN card.",
            );
            return false;
        }

        const result = source === "camera"
            ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
            : await ImagePicker.launchImageLibraryAsync({
                quality: 0.7,
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

        if (result.canceled || !result.assets?.[0]) return false;
        const asset = result.assets[0];

        await ensureApiBaseUrl();
        const token = await SecureStore.getItemAsync("token");

        const form = new FormData();
        form.append("file", {
            uri: asset.uri,
            name: asset.fileName || "pan.jpg",
            type: asset.mimeType || "image/jpeg",
        } as any);

        const res = await fetch(`${API_BASE_URL}/api/milkmen/pan-image`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: form,
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message || "Upload failed");
        }
        return true;
    } catch (e: any) {
        console.error("PAN upload failed:", e);
        Alert.alert("Could not upload", e?.message || "Please try again.");
        return false;
    }
}
