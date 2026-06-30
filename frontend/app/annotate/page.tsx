"use client";

import { useState } from "react";
import { annotate, imageFileUrl, ImageMeta } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

type ShapeType = "rectangle" | "circle" | "line" | "text" | "polygon";

interface Shape {
  type: ShapeType;
  color: string;
  thickness: number;
  [k: string]: unknown;
}

function defaultShape(type: ShapeType): Shape {
  const base = { type, color: "#00ff00", thickness: 2 };
  switch (type) {
    case "rectangle": return { ...base, x: 50, y: 50, w: 200, h: 100 };
    case "circle": return { ...base, cx: 150, cy: 150, radius: 60 };
    case "line": return { ...base, x1: 10, y1: 10, x2: 300, y2: 200 };
    case "text": return { ...base, x: 30, y: 60, text: "Hello", font_scale: 1.5 };
    case "polygon": return { ...base, points: [[50, 200], [200, 50], [350, 200]], fill: false };
    default: return base as Shape;
  }
}

const SHAPE_TYPES: ShapeType[] = ["rectangle", "circle", "line", "text", "polygon"];
const SHAPE_LABELS: Record<ShapeType, string> = {
  rectangle: "矩形", circle: "円", line: "直線", text: "テキスト", polygon: "ポリゴン",
};

export default function AnnotatePage() {
  const [source, setSource] = useState<ImageMeta | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [shapes, setShapes] = useState<Shape[]>([defaultShape("rectangle")]);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addShape = (type: ShapeType) => setShapes((s) => [...s, defaultShape(type)]);
  const removeShape = (i: number) => setShapes((s) => s.filter((_, j) => j !== i));
  const updateShape = (i: number, key: string, val: unknown) => {
    setShapes((s) => s.map((sh, j) => j === i ? { ...sh, [key]: val } : sh));
  };

  const handleRun = async () => {
    const id = source?.id ?? Number(sourceId);
    if (!id) { setError("画像を選択してください"); return; }
    setLoading(true); setError(null);
    try {
      const res = await annotate(id, shapes);
      setResultPreview(res.preview);
    } catch (e) { setError(e instanceof Error ? e.message : "失敗"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <h1>描画処理</h1>
        <p>矩形・円・直線・テキスト・ポリゴンを画像に描画する</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>入力画像</h2>
          <ImageUploader onUploaded={(m) => { setSource(m); setSourceId(String(m.id)); }} />
          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <label>または画像 ID</label>
            <input type="number" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setSource(null); }} />
          </div>
          {source && (
            <div className="img-box" style={{ marginTop: "0.75rem" }}>
              <img src={imageFileUrl(source.id)} alt="source" />
            </div>
          )}
        </div>

        <div className="card">
          <h2>図形の追加</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {SHAPE_TYPES.map((t) => (
              <button key={t} className="btn btn-secondary btn-sm" onClick={() => addShape(t)}>+ {SHAPE_LABELS[t]}</button>
            ))}
          </div>

          {shapes.map((sh, i) => (
            <div key={i} style={{ background: "var(--surface2)", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <strong style={{ fontSize: "0.875rem" }}>{SHAPE_LABELS[sh.type as ShapeType]}</strong>
                <button className="btn btn-danger btn-sm" onClick={() => removeShape(i)}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>色</label>
                  <input type="color" value={sh.color as string} onChange={(e) => updateShape(i, "color", e.target.value)} style={{ height: "32px", padding: "0.1rem" }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>太さ</label>
                  <input type="number" min={1} max={20} value={sh.thickness as number} onChange={(e) => updateShape(i, "thickness", Number(e.target.value))} />
                </div>
                {sh.type === "rectangle" && <>
                  {["x", "y", "w", "h"].map((k) => (
                    <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                      <label>{k}</label>
                      <input type="number" value={sh[k] as number} onChange={(e) => updateShape(i, k, Number(e.target.value))} />
                    </div>
                  ))}
                </>}
                {sh.type === "circle" && <>
                  {["cx", "cy", "radius"].map((k) => (
                    <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                      <label>{k}</label>
                      <input type="number" value={sh[k] as number} onChange={(e) => updateShape(i, k, Number(e.target.value))} />
                    </div>
                  ))}
                </>}
                {sh.type === "line" && <>
                  {["x1", "y1", "x2", "y2"].map((k) => (
                    <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                      <label>{k}</label>
                      <input type="number" value={sh[k] as number} onChange={(e) => updateShape(i, k, Number(e.target.value))} />
                    </div>
                  ))}
                </>}
                {sh.type === "text" && <>
                  <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                    <label>テキスト</label>
                    <input type="text" value={sh.text as string} onChange={(e) => updateShape(i, "text", e.target.value)} />
                  </div>
                  {["x", "y", "font_scale"].map((k) => (
                    <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                      <label>{k}</label>
                      <input type="number" step={k === "font_scale" ? 0.1 : 1} value={sh[k] as number} onChange={(e) => updateShape(i, k, Number(e.target.value))} />
                    </div>
                  ))}
                </>}
              </div>
            </div>
          ))}

          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn" onClick={handleRun} disabled={loading}>
            {loading ? "描画中..." : "✏️ 描画実行"}
          </button>
        </div>
      </div>

      {resultPreview && (
        <div className="card">
          <h2>描画結果</h2>
          <div className="img-box">
            <img src={resultPreview} alt="annotated" />
          </div>
        </div>
      )}
    </>
  );
}
