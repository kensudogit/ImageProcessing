"use client";

import { useRef, useState } from "react";
import { uploadImage, ImageMeta } from "@/lib/api";

interface Props {
  onUploaded: (img: ImageMeta) => void;
  label?: string;
}

export default function ImageUploader({ onUploaded, label = "画像をアップロード" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const meta = await uploadImage(file);
      onUploaded(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロード失敗");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <button className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? "アップロード中..." : `📁 ${label}`}
      </button>
    </div>
  );
}
