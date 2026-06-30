"use client";

import { useState } from "react";
import WebCamera from "@/components/WebCamera";
import UsbCameraPanel from "@/components/UsbCameraPanel";
import { uploadBase64, imageFileUrl, ImageMeta } from "@/lib/api";

type Tab = "web" | "usb";

export default function CameraPage() {
  const [tab, setTab] = useState<Tab>("web");
  const [captured, setCaptured] = useState<{ src: string; imageId?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWebCapture = async (dataUrl: string) => {
    setSaving(true); setError(null);
    try {
      const meta = await uploadBase64(dataUrl, "webcam_capture.png", "webcam");
      setCaptured({ src: imageFileUrl(meta.id), imageId: meta.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失敗");
      setCaptured({ src: dataUrl });
    } finally {
      setSaving(false);
    }
  };

  const handleUsbCapture = (preview: string, imageId: number) => {
    setCaptured({ src: preview, imageId });
  };

  return (
    <>
      <div className="page-header">
        <h1>カメラ入力</h1>
        <p>Web カメラ（ブラウザ）または USB カメラ（サーバー側）で撮影する</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "web" ? "active" : ""}`} onClick={() => setTab("web")}>🌐 Web カメラ</button>
        <button className={`tab ${tab === "usb" ? "active" : ""}`} onClick={() => setTab("usb")}>🔌 USB カメラ</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>{tab === "web" ? "Web カメラ" : "USB カメラ"}</h2>
          {error && <div className="alert alert-error">{error}</div>}
          {saving && <div className="alert alert-info">保存中...</div>}
          {tab === "web" ? (
            <WebCamera onCapture={handleWebCapture} />
          ) : (
            <UsbCameraPanel onCapture={handleUsbCapture} />
          )}
        </div>

        <div className="card">
          <h2>撮影結果</h2>
          {captured ? (
            <>
              <div className="img-box">
                <img src={captured.src} alt="captured" />
              </div>
              {captured.imageId && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  画像 ID: {captured.imageId} · <a href="/preprocess">前処理へ →</a>
                </p>
              )}
            </>
          ) : (
            <div className="img-box" style={{ color: "var(--text-muted)" }}>撮影後にここに表示されます</div>
          )}
        </div>
      </div>
    </>
  );
}
