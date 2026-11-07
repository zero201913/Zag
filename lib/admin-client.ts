"use client";

export interface ApiError extends Error {
  status?: number;
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    /* ignore */
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `请求失败（${response.status}）`;
    const error = new Error(message) as ApiError;
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  type: string;
}

export function uploadFile(
  file: File,
  kind: "photo" | "cover" | "audio" | "avatar",
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as UploadResult);
      } else {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : `上传失败（${xhr.status}）`;
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("网络错误，上传失败"));
    xhr.onabort = () => reject(new Error("上传已取消"));
    xhr.send(form);
  });
}

export async function getImageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  } catch {
    return { width: null as number | null, height: null as number | null };
  }
}

export function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      finish(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    };
    audio.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 8000);
    audio.src = url;
  });
}