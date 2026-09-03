import type { VideoStorageKind } from "./types";

const DATA_URL_LIMIT_BYTES = 4_500_000;

export type PreparedVideo = {
  url: string;
  mimeType: string;
  storageKind: VideoStorageKind;
  duration?: number;
  note?: string;
};

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function prepareVideoFile(file: File): Promise<PreparedVideo> {
  if (file.size <= DATA_URL_LIMIT_BYTES) {
    return {
      url: await readFileAsDataUrl(file),
      mimeType: file.type || "video/mp4",
      storageKind: "local_data_url",
      note: "Saved in this browser for the prototype."
    };
  }

  return {
    url: URL.createObjectURL(file),
    mimeType: file.type || "video/mp4",
    storageKind: "session_object_url",
    note: "Large file kept for this browser session only."
  };
}

export function getVideoDuration(url: string) {
  return new Promise<number | undefined>((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (duration?: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(), 4000);
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : undefined);
    video.onerror = () => finish();
    video.src = url;
  });
}
