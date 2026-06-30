"use client";

import { useEffect, useRef, useState } from "react";
import { getMlFrameworks, listMlModels, trainModel, predictImage, imageFileUrl, ImageMeta } from "@/lib/api";
import ImageUploader from "@/components/ImageUploader";

interface ModelInfo { id: number; name: string; backend: string; labels: string[]; metrics: Record<string, number>; created_at: string; }

export default function MlPage() {
  const [frameworks, setFrameworks] = useState<Record<string, string | null>>({});
  const [activeBackend, setActiveBackend] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [tab, setTab] = useState<"train" | "predict">("train");
  const [error, setError] = useState<string | null>(null);

  // Train state
  const [trainName, setTrainName] = useState("");
  const [trainBackend, setTrainBackend] = useState("auto");
  const [trainFiles, setTrainFiles] = useState<File[]>([]);
  const [trainLabels, setTrainLabels] = useState<string[]>([]);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<{ labels: string[]; test_accuracy: number; backend: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predict state
  const [predSource, setPredSource] = useState<ImageMeta | null>(null);
  const [predSourceId, setPredSourceId] = useState("");
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predResult, setPredResult] = useState<{ label: string; confidence: number; backend: string } | null>(null);

  useEffect(() => {
    getMlFrameworks().then((r) => { setFrameworks(r.frameworks); setActiveBackend(r.active_backend); }).catch(() => {});
    loadModels();
  }, []);

  const loadModels = async () => {
    try { const r = await listMlModels(); setModels(r.models); } catch {}
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setTrainFiles((prev) => [...prev, ...files]);
    setTrainLabels((prev) => [...prev, ...files.map(() => "")]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTrain = async () => {
    if (!trainName) { setError("モデル名を入力してください"); return; }
    if (trainFiles.length === 0) { setError("画像を追加してください"); return; }
    if (trainLabels.some((l) => !l)) { setError("すべてのラベルを入力してください"); return; }
    setTraining(true); setError(null);
    try {
      const res = await trainModel(trainName, trainBackend, trainFiles, trainLabels) as any;
      setTrainResult({ labels: res.labels, test_accuracy: res.test_accuracy, backend: res.backend });
      loadModels();
    } catch (e) { setError(e instanceof Error ? e.message : "失敗"); }
    finally { setTraining(false); }
  };

  const handlePredict = async () => {
    const id = predSource?.id ?? Number(predSourceId);
    if (!id) { setError("画像を選択してください"); return; }
    if (!selectedModel) { setError("モデルを選択してください"); return; }
    setPredicting(true); setError(null);
    try {
      const res = await predictImage(id, selectedModel) as any;
      setPredResult({ label: res.label, confidence: res.confidence, backend: res.backend });
    } catch (e) { setError(e instanceof Error ? e.message : "失敗"); }
    finally { setPredicting(false); }
  };

  return (
    <>
      <div className="page-header">
        <h1>深層学習</h1>
        <p>CNN モデルの学習・推論（sklearn フォールバック / TensorFlow / PyTorch）</p>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2>フレームワーク状態</h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {Object.entries(frameworks).map(([k, v]) => (
            <span key={k} className={`badge ${v ? "badge-green" : "badge-blue"}`}>
              {k}: {v ?? "未インストール"}
            </span>
          ))}
          {activeBackend && (
            <span className="badge badge-green">アクティブ: {activeBackend}</span>
          )}
        </div>
        <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          TensorFlow / PyTorch は <code>install-ml.bat</code> でインストールできます
        </p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "train" ? "active" : ""}`} onClick={() => setTab("train")}>モデル学習</button>
        <button className={`tab ${tab === "predict" ? "active" : ""}`} onClick={() => setTab("predict")}>推論</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tab === "train" && (
        <div className="grid-2">
          <div className="card">
            <h2>学習設定</h2>
            <div className="form-group">
              <label>モデル名</label>
              <input type="text" value={trainName} onChange={(e) => setTrainName(e.target.value)} placeholder="例: cats_vs_dogs" />
            </div>
            <div className="form-group">
              <label>バックエンド</label>
              <select value={trainBackend} onChange={(e) => setTrainBackend(e.target.value)}>
                {["auto", "sklearn", "tensorflow", "pytorch"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleAddFiles} style={{ display: "none" }} />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ marginBottom: "0.75rem" }}>
              + 画像を追加
            </button>
            {trainFiles.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                  {f.name}
                </span>
                <input
                  type="text" placeholder="ラベル"
                  value={trainLabels[i] ?? ""}
                  onChange={(e) => setTrainLabels((prev) => prev.map((l, j) => j === i ? e.target.value : l))}
                  style={{ width: "120px" }}
                />
                <button className="btn btn-danger btn-sm" onClick={() => {
                  setTrainFiles((p) => p.filter((_, j) => j !== i));
                  setTrainLabels((p) => p.filter((_, j) => j !== i));
                }}>✕</button>
              </div>
            ))}
            <button className="btn" onClick={handleTrain} disabled={training} style={{ marginTop: "0.75rem" }}>
              {training ? "学習中..." : "🤖 学習開始"}
            </button>
          </div>
          <div className="card">
            <h2>学習結果</h2>
            {trainResult ? (
              <>
                <div className="alert alert-success">学習完了</div>
                <p><strong>バックエンド:</strong> {trainResult.backend}</p>
                <p><strong>テスト精度:</strong> {(trainResult.test_accuracy * 100).toFixed(1)}%</p>
                <p><strong>クラス:</strong> {trainResult.labels.join(", ")}</p>
              </>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>学習後に結果が表示されます</p>
            )}
            {models.length > 0 && (
              <>
                <h3 style={{ marginTop: "1rem" }}>保存済みモデル ({models.length}件)</h3>
                {models.map((m) => (
                  <div key={m.id} style={{ background: "var(--surface2)", borderRadius: "0.4rem", padding: "0.6rem", marginBottom: "0.5rem" }}>
                    <div><strong>{m.name}</strong> <span className="badge badge-blue" style={{ marginLeft: "0.25rem" }}>{m.backend}</span></div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      クラス: {m.labels?.join(", ")} · 精度: {((m.metrics?.test_accuracy ?? 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "predict" && (
        <div className="grid-2">
          <div className="card">
            <h2>推論設定</h2>
            <ImageUploader onUploaded={(m) => { setPredSource(m); setPredSourceId(String(m.id)); }} />
            <div className="form-group" style={{ marginTop: "0.75rem" }}>
              <label>または画像 ID</label>
              <input type="number" value={predSourceId} onChange={(e) => { setPredSourceId(e.target.value); setPredSource(null); }} />
            </div>
            {predSource && (
              <div className="img-box" style={{ marginTop: "0.75rem", marginBottom: "0.75rem" }}>
                <img src={imageFileUrl(predSource.id)} alt="source" />
              </div>
            )}
            <div className="form-group">
              <label>モデル選択</label>
              <select value={selectedModel ?? ""} onChange={(e) => setSelectedModel(Number(e.target.value))}>
                <option value="">-- 選択してください --</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.backend})</option>
                ))}
              </select>
            </div>
            <button className="btn" onClick={handlePredict} disabled={predicting}>
              {predicting ? "推論中..." : "▶ 推論実行"}
            </button>
          </div>
          <div className="card">
            <h2>推論結果</h2>
            {predResult ? (
              <>
                <div className="alert alert-success">推論完了</div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>{predResult.label}</p>
                <p><strong>信頼度:</strong> {(predResult.confidence * 100).toFixed(1)}%</p>
                <p><strong>バックエンド:</strong> {predResult.backend}</p>
              </>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>推論後に結果が表示されます</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
