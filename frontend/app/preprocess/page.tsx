"use client";

import { useState } from "react";
import { preprocess, imageFileUrl, PrepStep, ImageMeta } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

const OPERATIONS = [
  { key: "grayscale", label: "グレースケール化", params: [] },
  { key: "binarize", label: "2値化", params: [
    { name: "method", type: "select", options: ["otsu", "threshold"], default: "otsu" },
    { name: "threshold", type: "number", min: 0, max: 255, default: 127 },
  ]},
  { key: "edge", label: "エッジ抽出", params: [
    { name: "method", type: "select", options: ["canny", "sobel", "laplacian"], default: "canny" },
    { name: "low", type: "number", min: 0, max: 255, default: 50 },
    { name: "high", type: "number", min: 0, max: 500, default: 150 },
  ]},
  { key: "resize", label: "リサイズ", params: [
    { name: "width", type: "number", min: 1, max: 4096, default: 640 },
    { name: "height", type: "number", min: 1, max: 4096, default: 480 },
    { name: "interpolation", type: "select", options: ["linear", "nearest", "cubic", "area", "lanczos"], default: "linear" },
  ]},
  { key: "flip", label: "反転", params: [
    { name: "mode", type: "select", options: ["horizontal", "vertical", "both"], default: "horizontal" },
  ]},
  { key: "color_convert", label: "色変換", params: [
    { name: "code", type: "select", options: ["hsv", "lab", "rgb", "gray", "yuv", "xyz", "hls"], default: "hsv" },
  ]},
  { key: "filter", label: "フィルター", params: [
    { name: "type", type: "select", options: ["blur", "gaussian", "median", "bilateral", "sharpen"], default: "gaussian" },
    { name: "ksize", type: "number", min: 1, max: 31, default: 5 },
  ]},
];

type OpConfig = { operation: string; [k: string]: unknown };

function buildDefaults(op: typeof OPERATIONS[number]): OpConfig {
  const cfg: OpConfig = { operation: op.key };
  op.params.forEach((p) => { cfg[p.name] = p.default; });
  return cfg;
}

export default function PreprocessPage() {
  const [source, setSource] = useState<ImageMeta | null>(null);
  const [sourceId, setSourceId] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [opParams, setOpParams] = useState<Record<string, OpConfig>>({});
  const [steps, setSteps] = useState<PrepStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOp = (key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      const op = OPERATIONS.find((o) => o.key === key)!;
      setOpParams((p) => ({ ...p, [key]: buildDefaults(op) }));
      return [...prev, key];
    });
  };

  const setParam = (opKey: string, name: string, val: unknown) => {
    setOpParams((prev) => ({ ...prev, [opKey]: { ...prev[opKey], [name]: val } }));
  };

  const handleRun = async () => {
    const id = source?.id ?? Number(sourceId);
    if (!id) { setError("画像を選択してください"); return; }
    if (selected.length === 0) { setError("処理を1つ以上選択してください"); return; }
    setLoading(true); setError(null);
    try {
      const ops = selected.map((k) => opParams[k] ?? { operation: k });
      const res = await preprocess(id, ops);
      setSteps(res.steps);
    } catch (e) { setError(e instanceof Error ? e.message : "失敗"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <h1>画像前処理</h1>
        <p>複数の前処理をパイプライン実行し、ステップごとに結果を確認できます</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>入力画像</h2>
          <ImageUploader onUploaded={(m) => { setSource(m); setSourceId(String(m.id)); }} />
          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <label>または画像 ID を直接入力</label>
            <input type="number" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setSource(null); }} placeholder="例: 1" />
          </div>
          {source && (
            <div className="img-box" style={{ marginTop: "0.75rem" }}>
              <img src={imageFileUrl(source.id)} alt="source" />
            </div>
          )}
        </div>

        <div className="card">
          <h2>前処理選択</h2>
          {OPERATIONS.map((op) => (
            <div key={op.key} style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={selected.includes(op.key)} onChange={() => toggleOp(op.key)} />
                <span style={{ fontWeight: 500 }}>{op.label}</span>
              </label>
              {selected.includes(op.key) && op.params.length > 0 && (
                <div style={{ paddingLeft: "1.5rem", marginTop: "0.4rem" }}>
                  {op.params.map((p) => (
                    <div key={p.name} className="form-group" style={{ marginBottom: "0.4rem" }}>
                      <label style={{ fontSize: "0.75rem" }}>{p.name}</label>
                      {p.type === "select" ? (
                        <select
                          value={String(opParams[op.key]?.[p.name] ?? p.default)}
                          onChange={(e) => setParam(op.key, p.name, e.target.value)}
                        >
                          {(p as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type="number" min={(p as any).min} max={(p as any).max}
                          value={String(opParams[op.key]?.[p.name] ?? p.default)}
                          onChange={(e) => setParam(op.key, p.name, Number(e.target.value))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn" onClick={handleRun} disabled={loading} style={{ marginTop: "0.75rem" }}>
            {loading ? "処理中..." : "▶ 実行"}
          </button>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="card">
          <h2>処理結果 ({steps.length} ステップ)</h2>
          <div className="grid-3">
            {steps.map((step, i) => (
              <div key={i}>
                <div className="img-box">
                  <img src={step.preview} alt={step.operation} />
                </div>
                <div className="label" style={{ textAlign: "center", marginTop: "0.4rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Step {i + 1}: {step.operation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
