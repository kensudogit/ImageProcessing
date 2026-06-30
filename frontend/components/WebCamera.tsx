"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function WebCamera({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch (e) {
      setError("カメラにアクセスできませんでした: " + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    onCapture(dataUrl);
  }, [onCapture]);

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="img-box" style={{ marginBottom: "1rem" }}>
        <video ref={videoRef} style={{ maxWidth: "100%", maxHeight: "360px" }} playsInline muted />
        {!streaming && <span style={{ color: "var(--text-muted)" }}>カメラ停止中</span>}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {!streaming ? (
          <button className="btn" onClick={startCamera}>カメラ開始</button>
        ) : (
          <>
            <button className="btn" onClick={capture}>📸 撮影</button>
            <button className="btn btn-secondary" onClick={stopCamera}>停止</button>
          </>
        )}
      </div>
    </div>
  );
}
