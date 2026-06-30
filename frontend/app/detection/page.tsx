"use client";

import { useState } from "react";
import { detect, imageFileUrl, DetectionResult, ImageMeta } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

const METHODS = [
  { key: "contour", label: "輪郭検出 (Contour)", desc: "OpenCV 2値化 + findContours" },
  { key: "haar", label: "Haar Cascade", desc: "顔・目などの古典検出" },
  { key: "dnn", label: "DNN (MobileNet-SSD)", desc: "OpenCV DNN 事前学習モデル" },
  { key: "yolo", label: "YOLO v8", desc: "高精度 DL 検出（要 ultralytics）" },
];

const CASCADE_OPTIONS = ["face", "eye", "fullbody", "upperbody", "smile"];

export default function DetectionPage() {
  const [source, setSource] = useState<ImageMeta | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [method, setMethod] = useState("contour");
  const [minArea, setMinArea] = useState(500);
  const [confidence, setConfidence] = useState(0.5);
  const [cascade, setCascade] = useState("face");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    const id = source?.id ?? Number(sourceId);
    if (!id) { setError("画像を選択してください"); return; }
    setLoading(true); setError(null);
    try {
      const res = await detect(id, method, { min_area: minArea, confidence_threshold: confidence, cascade });
      setResult(res);
    } catch (e) { setError(e instanceof Error ? e.message : "失敗"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <h1>オブジェクト検出</h1>
        <p>古典手法（Contour・Haar）と深層学習（DNN・YOLO）を切り替えて検出</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>設定</h2>
          <ImageUploader onUploaded={(m) => { setSource(m); setSourceId(String(m.id)); }} />
          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <label>または画像 ID</label>
            <input type="number" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setSource(null); }} />
          </div>
          {source && (
            <div className="img-box" style={{ marginTop: "0.75rem", marginBottom: "1rem" }}>
              <img src={imageFileUrl(source.id)} alt="source" />
            </div>
          )}
          <div className="form-group">
            <label>検出メソッド</label>
            {METHODS.map((m) => (
              <label key={m.key} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem", cursor: "pointer" }}>
                <input type="radio" name="method" value={m.key} checked={method === m.key} onChange={() => setMethod(m.key)} style={{ marginTop: "0.2rem" }} />
                <span>
                  <span style={{ fontWeight: 500 }}>{m.label}</span>
                  <br /><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.desc}</span>
                </span>
              </label>
            ))}
          </div>
          {method === "contour" && (
            <div className="form-group">
              <label>最小面積 ({minArea}px²)</label>
              <input type="range" min={10} max={5000} value={minArea} onChange={(e) => setMinArea(Number(e.target.value))} />
            </div>
          )}
          {method === "haar" && (
            <div className="form-group">
              <label>Cascade 種別</label>
              <select value={cascade} onChange={(e) => setCascade(e.target.value)}>
                {CASCADE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {(method === "dnn" || method === "yolo") && (
            <div className="form-group">
              <label>信頼度閾値 ({confidence.toFixed(2)})</label>
              <input type="range" min={0.1} max={0.99} step={0.01} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn" onClick={handleDetect} disabled={loading}>
            {loading ? "検出中..." : "🔍 検出実行"}
          </button>
        </div>

        <div className="card">
          <h2>検出結果</h2>
          {result ? (
            <>
              <div className="img-box">
                <img src={result.preview} alt="result" />
              </div>
              <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                メソッド: <strong>{result.method}</strong> · 検出数: <strong>{result.count}</strong>
              </p>
              {result.objects.length > 0 && (
                <table style={{ width: "100%", marginTop: "0.75rem", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["ラベル", "信頼度", "X", "Y", "W", "H"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "0.3rem 0.5rem", color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.objects.map((b, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.3rem 0.5rem" }}>{b.label}</td>
                        <td style={{ padding: "0.3rem 0.5rem" }}>{(b.confidence * 100).toFixed(1)}%</td>
                        <td style={{ padding: "0.3rem 0.5rem" }}>{b.x}</td>
                        <td style={{ padding: "0.3rem 0.5rem" }}>{b.y}</td>
                        <td style={{ padding: "0.3rem 0.5rem" }}>{b.w}</td>
                        <td style={{ padding: "0.3rem 0.5rem" }}>{b.h}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <div className="img-box" style={{ color: "var(--text-muted)" }}>検出実行後に結果が表示されます</div>
          )}
        </div>
      </div>
    </>
  );
}
