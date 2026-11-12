import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { FileRecord } from "./types";
import { MAX_PREVIEW_BYTES, MAX_PREVIEW_LINES } from "./files";

export interface FilePreview {
  status: "ok" | "too-large" | "missing";
  text: string;
  totalLines: number;
  truncated: boolean;
}

const EMPTY: FilePreview = {
  status: "missing",
  text: "",
  totalLines: 0,
  truncated: false,
};

/** 从 R2 读取文本文件用于预览；超过 512KB 或缺失时返回对应状态，不抛错。 */
export async function readFilePreview(file: FileRecord): Promise<FilePreview> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const head = await env.BUCKET.head(file.r2_key);
    if (!head) return EMPTY;
    if (head.size > MAX_PREVIEW_BYTES) {
      return {
        status: "too-large",
        text: "",
        totalLines: 0,
        truncated: false,
      };
    }

    const object = await env.BUCKET.get(file.r2_key);
    if (!object) return EMPTY;

    const raw = await object.text();
    const text = raw.replace(/^\uFEFF/, "");
    const lines = text.split(/\r\n|\r|\n/);
    const truncated = lines.length > MAX_PREVIEW_LINES;
    return {
      status: "ok",
      text: truncated ? lines.slice(0, MAX_PREVIEW_LINES).join("\n") : text,
      totalLines: lines.length,
      truncated,
    };
  } catch (error) {
    console.error("failed to read file preview", error);
    return EMPTY;
  }
}