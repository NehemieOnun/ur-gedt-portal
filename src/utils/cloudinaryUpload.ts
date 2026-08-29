/**
 * Uploads a file directly from the browser to Cloudinary using an unsigned upload
 * preset, returning the resulting hosted URL. This replaces embedding files as
 * base64 text in the app database — base64 blobs are slow to save, prone to
 * connection timeouts on a remote Postgres database, and bloat every future read
 * of that record. Cloudinary hosts the actual file; the app only ever stores a
 * short URL string.
 *
 * Requires two Vite environment variables (safe to expose client-side — neither is
 * a secret; the actual Cloudinary API secret is never used here, since unsigned
 * uploads authenticate via the preset instead):
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 */
export class CloudinaryConfigError extends Error {}

function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;
  if (!cloudName || !uploadPreset) {
    throw new CloudinaryConfigError(
      "Hébergement de fichiers non configuré (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET manquants dans .env)."
    );
  }
  return { cloudName, uploadPreset };
}

export interface CloudinaryUploadResult {
  url: string;
  resourceType: string;
  bytes: number;
}

/**
 * Uploads a File to Cloudinary. Picks the right endpoint based on file type
 * (image/video/raw for pdf & audio) and reports upload progress via onProgress
 * (0-100), since large files can take a few seconds even when hosted externally.
 */
export function uploadFileToCloudinary(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  let resourceType: "image" | "video" | "raw" = "raw";
  if (file.type.startsWith("image/")) resourceType = "image";
  else if (file.type.startsWith("video/") || file.type.startsWith("audio/")) resourceType = "video"; // Cloudinary handles audio via the video endpoint

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
          resolve({ url: response.secure_url, resourceType, bytes: response.bytes || file.size });
        } else {
          reject(new Error(response.error?.message || "Échec du téléversement vers l'hébergeur de fichiers."));
        }
      } catch {
        reject(new Error("Réponse invalide de l'hébergeur de fichiers."));
      }
    };

    xhr.onerror = () => reject(new Error("Connexion à l'hébergeur de fichiers impossible."));
    xhr.send(formData);
  });
}
