"use client";

import { useEffect, useState } from "react";
import { listCameraDevices, openCamera, captureFrame, closeCamera, cameraStatus } from "@/lib/api";

interface Props {
  onCapture: (previewUrl: string, imageId: number) => void;
}

export default function UsbCameraPanel({ onCapture }: Props) {
  const [devices, setDevices] = useState<number[]>([]);
  const [selected, setSelected] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCameraDevices().then((r) => setDevices(r.devices)).catch(() => setDevices([]));
    cameraStatus().then((r) => setIsOpen(r.is_open)).catch(() => {});
  }, []);

  const handleOpen = async () => {
    setLoading(true); setError(null);
    try {
      await openCamera(selected);
      setIsOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const handleCapture = async () => {
    setLoading(true); setError(null);
    try {
      const r = await captureFrame();
      onCapture(r.preview, r.image_id);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const handleClose = async () => {
    await closeCamera().catch(() => {});
    setIsOpen(false);
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label>デバイス</label>
        <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
          {devices.length === 0
            ? <option value={0}>デバイス 0 (デフォルト)</option>
            : devices.map((d) => <option key={d} value={d}>デバイス {d}</option>)
          }
        </select>
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {!isOpen ? (
          <button className="btn" onClick={handleOpen} disabled={loading}>
            {loading ? "接続中..." : "USB カメラ接続"}
          </button>
        ) : (
          <>
            <button className="btn" onClick={handleCapture} disabled={loading}>
              {loading ? "撮影中..." : "📸 フレーム取得"}
            </button>
            <button className="btn btn-secondary" onClick={handleClose}>切断</button>
          </>
        )}
      </div>
      <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        ※ USB カメラはサーバー側（ローカル実行）でのみ動作します
      </p>
    </div>
  );
}
