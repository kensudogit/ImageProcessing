"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsageGuidePanel } from "@/components/UsageGuidePanel";

const NAV = [
  { href: "/", label: "ダッシュボード" },
  { href: "/camera", label: "カメラ入力" },
  { href: "/preprocess", label: "前処理" },
  { href: "/detection", label: "オブジェクト検出" },
  { href: "/annotate", label: "描画" },
  { href: "/ml", label: "深層学習" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <title>ImageProcessing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="layout">
          <aside className="sidebar">
            <h2>🖼 ImageProc</h2>
            <nav>
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={pathname === n.href ? "active" : ""}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="main-content">{children}</main>
        </div>
        <UsageGuidePanel />
      </body>
    </html>
  );
}
