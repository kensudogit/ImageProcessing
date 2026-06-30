"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listImages, ImageMeta, imageFileUrl, deleteImage } from "@/lib/api";

export default function Dashboard() {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listImages(0, 20);
      setImages(res.images);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データ取得失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    try { await deleteImage(id); load(); } catch {}
  };

  return (
    <>
      <div className="page-header">
        <h1>ダッシュボード</h1>
        <p>画像一覧と処理履歴</p>
      </div>

      <div className="grid-3" style={{ marginBottom: "1.5rem" }}>
        {[
          { href: "/camera", label: "📷 カメラ入力", desc: "Web・USB カメラ" },
          { href: "/preprocess", label: "🔧 前処理", desc: "グレースケール・2値化・エッジ等" },
          { href: "/detection", label: "🔍 検出", desc: "Contour / Haar / DNN / YOLO" },
          { href: "/annotate", label: "✏️ 描画", desc: "矩形・円・テキスト・ポリゴン" },
          { href: "/ml", label: "🤖 深層学習", desc: "CNN 学習・推論" },
        ].map((c) => (
          <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer", height: "100%" }}>
              <h2>{c.label}</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>保存済み画像 ({total}件)</h2>
          <button className="btn btn-secondary btn-sm" onClick={load}>更新</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="loading">読み込み中...</div>}
        {!loading && images.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>画像がありません。カメラからキャプチャするか画像をアップロードしてください。</p>
        )}
        <div className="grid-3">
          {images.map((img) => (
            <div key={img.id} style={{ background: "var(--surface2)", borderRadius: "0.5rem", overflow: "hidden" }}>
              <div className="img-box" style={{ minHeight: "120px", maxHeight: "140px" }}>
                <img src={imageFileUrl(img.id)} alt={img.filename} />
              </div>
              <div style={{ padding: "0.6rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  #{img.id} · {img.source} · {img.width}×{img.height}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {new Date(img.created_at).toLocaleString("ja-JP")}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(img.id)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
