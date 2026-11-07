"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { uploadFile, type UploadResult } from "@/lib/admin-client";
import { Icon } from "../icons";

export function UploadButton({
  kind,
  label,
  accept,
  onUploaded,
  onError,
  className = "btn",
}: {
  kind: "photo" | "cover" | "audio" | "avatar";
  label: string;
  accept?: string;
  onUploaded: (result: UploadResult) => void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProgress(0);
    try {
      const result = await uploadFile(file, kind, setProgress);
      onUploaded(result);
    } catch (error) {
      onError?.((error as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        className={className}
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
      >
        <Icon name={progress !== null ? "loader" : "upload"} size={15} className={progress !== null ? "animate-spin" : ""} />
        {progress !== null ? `上传中 ${progress}%` : label}
      </button>
    </>
  );
}