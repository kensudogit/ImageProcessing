'use client'

/**
 * 画面右下のドラッグ可能な利用手順パネル（localStorage で位置・開閉を保存）。
 * ImageProcessing — アーキテクチャ概要・機能別操作手順を表示。
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'imgproc-usage-guide-v1'
const PANEL_WIDTH = 440

type GuideStep = {
  title: string
  body: string
  items?: readonly string[]
}

type FeaturedBlock = {
  badge: string
  title: string
  body: string
  items?: readonly string[]
  variant?: 'architecture' | 'opencv' | 'detection' | 'dl' | 'camera' | 'preprocess' | 'annotate' | 'deploy' | 'default'
}

const architectureFeatured: FeaturedBlock = {
  badge: 'Architecture',
  title: 'FastAPI + Next.js 構成',
  body:
    'フロントエンド（Next.js）からのリクエストは /api/* を FastAPI（port 8000）へプロキシ。画像は PostgreSQL にメタデータを保存し、実ファイルは uploads/ ディレクトリに PNG 形式で永続化します。',
  variant: 'architecture',
  items: [
    'Next.js :3000 — 6 画面（カメラ / 前処理 / 検出 / 描画 / 深層学習 / ダッシュボード）',
    'FastAPI :8000 — 画像 I/O · 前処理 · 検出 · 描画 · カメラ · ML の 6 ルーター',
    'PostgreSQL :5434（Docker）— images / processing_jobs / detection_results / annotations / ml_models',
    'uploads/ — 保存画像の実ファイル（PNG。処理結果も別 ID で保存）',
    'models/ — scikit-learn(.joblib) / TensorFlow(.keras) / PyTorch(.pt) モデル',
    '/health — 生存確認 · /docs — Swagger API リファレンス',
  ],
}

const opencvFeatured: FeaturedBlock = {
  badge: 'OpenCV',
  title: 'OpenCV 4.10 — 前処理・描画・検出',
  body:
    'opencv-python（ローカル）または opencv-python-headless（Railway/Docker）をインストール済み。ndarray ↔ base64/PNG の変換は utils/opencv_codec.py が担当します。',
  variant: 'opencv',
  items: [
    'グレースケール — cv2.cvtColor(BGR2GRAY)',
    '2値化 — cv2.threshold（Otsu / 固定閾値）',
    'エッジ抽出 — cv2.Canny · Sobel · Laplacian',
    'リサイズ — cv2.resize（linear / nearest / cubic / area / lanczos）',
    '反転 — cv2.flip（水平 / 垂直 / 両方）',
    '色変換 — cv2.cvtColor（HSV / LAB / RGB / YUV / XYZ / HLS）',
    'フィルター — GaussianBlur · blur · medianBlur · bilateralFilter · sharpen',
    '描画 — rectangle · circle · line · putText · fillPoly',
  ],
}

const detectionFeatured: FeaturedBlock = {
  badge: 'Detection',
  title: 'オブジェクト検出 — 4 メソッド切替',
  body:
    '古典手法（contour / haar）と深層学習（dnn / yolo）を API パラメータで切り替えられます。dnn は MobileNet-SSD（21クラス）、yolo は ultralytics YOLOv8n（要 install-ml）。',
  variant: 'detection',
  items: [
    'contour — cv2.findContours + 面積フィルタ。形状・領域の輪郭を検出',
    'haar — cv2.CascadeClassifier（顔・目・体・笑顔）古典的なスライドウィンドウ法',
    'dnn — cv2.dnn.readNetFromCaffe + MobileNet-SSD。人物・車・犬など 21 クラス',
    'yolo — YOLOv8n（ultralytics）。高精度・多クラス（要 install-ml.bat）',
    '結果 — {label, confidence, x, y, w, h} 配列 + 矩形描画済み画像',
    'fallback — dnn モデル未ダウンロード時は contour にフォールバック',
  ],
}

const dlFeatured: FeaturedBlock = {
  badge: 'Deep Learning',
  title: '深層学習 CNN 分類 — 3 バックエンド',
  body:
    'ラベル付き画像をアップロードして CNN 分類モデルを学習。sklearn RandomForest（常時）→ TensorFlow Keras CNN → PyTorch CNN の優先順で自動切替。モデルはディスクに永続化されます。',
  variant: 'dl',
  items: [
    'sklearn — HOG 特徴量 + RandomForest（TF/PT 未インストール時の自動フォールバック）',
    'TensorFlow — Conv2D × 2 + Dense CNN（Keras Sequential）',
    'PyTorch — Conv2d × 2 + FC 層 SimpleCNN',
    '画像サイズ — 学習時に 64×64 へリサイズして正規化',
    'モデル保存 — .keras / .pt / .joblib 形式で models/ml/ に永続化',
    '推論 — モデル ID + 画像 ID を指定してラベルと信頼度を取得',
    'インストール — install-ml.bat で TensorFlow · PyTorch · YOLO を追加',
  ],
}

const cameraFeatured: FeaturedBlock = {
  badge: 'Camera',
  title: 'カメラ入力 — Web + USB 両対応',
  body:
    'ブラウザから Web カメラ（getUserMedia）で撮影し、base64 として API へ送信。USB カメラはサーバー側の cv2.VideoCapture で制御（ローカル実行専用）。',
  variant: 'camera',
  items: [
    'Web カメラ — getUserMedia → canvas.toDataURL → POST /api/images/from-base64',
    'USB カメラ — GET /api/camera/devices で接続確認 → open → capture → close',
    'キャプチャ後 — 自動的に images テーブルに保存され、画像 ID が発行される',
    '設定 — POST /api/camera/settings で brightness / contrast / exposure を調整',
    '注意 — USB カメラは Docker/Railway では使用不可。ローカル開発専用',
    'フォールバック — USB 接続失敗時はエラーメッセージを表示し Web カメラを推奨',
  ],
}

const preprocessFeatured: FeaturedBlock = {
  badge: 'Preprocess',
  title: '前処理パイプライン — 7 種',
  body:
    'POST /api/preprocess/{image_id} に operations 配列を渡すと順番に適用し、各ステップの結果画像を DB に保存します。ステップごとのプレビュー（base64）も返却されます。',
  variant: 'preprocess',
  items: [
    '処理順 — operations の配列順に適用（例: grayscale → edge → resize）',
    'grayscale — BGR→GRAY→BGR（チャンネル数を揃えて返す）',
    'binarize — method: otsu / threshold + threshold 値',
    'edge — method: canny / sobel / laplacian + low / high',
    'resize — width / height + interpolation（linear / nearest / cubic 等）',
    'flip — mode: horizontal / vertical / both',
    'color_convert — code: hsv / lab / rgb / gray / yuv / xyz / hls',
    'filter — type: blur / gaussian / median / bilateral / sharpen + ksize',
  ],
}

const annotateFeatured: FeaturedBlock = {
  badge: 'Annotation',
  title: '描画処理 — 5 種の図形',
  body:
    'POST /api/annotation/{image_id} に shapes 配列を渡すと OpenCV で描画し、結果画像を DB に保存します。色は #rrggbb 形式または [R,G,B] 配列で指定します。',
  variant: 'annotate',
  items: [
    'rectangle — x, y, w, h, color, thickness',
    'circle — cx, cy, radius, color, thickness',
    'line — x1, y1, x2, y2, color, thickness',
    'text — x, y, text, font_scale, color（cv2.FONT_HERSHEY_SIMPLEX）',
    'polygon — points: [[x,y],...], color, fill: true/false',
    'レイヤー — shapes を配列で渡すと順番に重ね描き（後の要素が上に表示）',
    '結果 — 描画済み画像の DB ID + プレビュー base64 を返却',
  ],
}

const deployFeatured: FeaturedBlock = {
  badge: 'Deploy',
  title: 'Railway デプロイ — Docker 構成',
  body:
    '単一 Railway サービスで Next.js + FastAPI を起動。Node ステージでフロントをビルド後、Python 3.12 ランタイムに Next.js 成果物とバックエンドを配置。start.sh が両プロセスを管理します。',
  variant: 'deploy',
  items: [
    'Dockerfile — Node 20（フロントビルド）→ Python 3.12（本番ランタイム）2 ステージ',
    'opencv-python-headless — サーバー環境向け（libGL 不要）',
    'start.sh — uvicorn :8000 + npm start $PORT で同時起動',
    '環境変数 — DATABASE_URL（Railway PostgreSQL）を追加するだけで接続',
    '/health — FastAPI の生存確認エンドポイント（ヘルスチェック）',
    'ローカル — docker compose up -d（PostgreSQL :5434）→ backend · frontend 別ターミナル',
  ],
}

const techStack = [
  'Python 3.12 · FastAPI',
  'OpenCV 4.10',
  'Next.js 16 · React 19',
  'PostgreSQL 16',
  'scikit-learn · HOG',
  'TensorFlow 2.18（opt）',
  'PyTorch 2.5（opt）',
  'ultralytics YOLOv8（opt）',
  'MobileNet-SSD DNN',
  'Docker · Railway',
] as const

const archDiagram = `Browser
    │ HTTP / base64 / FormData
    ▼
Next.js :3000
    ├─ /              ダッシュボード（画像一覧）
    ├─ /camera        Web カメラ / USB カメラ
    ├─ /preprocess    前処理パイプライン
    ├─ /detection     オブジェクト検出
    ├─ /annotate      描画エディタ
    ├─ /ml            深層学習（学習 / 推論）
    └─ /api/* ──proxy──► FastAPI :8000
              ├─ /api/images   画像 I/O
              ├─ /api/preprocess  前処理
              ├─ /api/detection   検出
              ├─ /api/annotation  描画
              ├─ /api/camera      USB カメラ
              ├─ /api/ml          深層学習
              ├─ PostgreSQL :5434（メタデータ）
              └─ uploads/ · models/（ファイル）`

type GuideSection = {
  label: string
  steps: readonly GuideStep[]
}

const guideSections: readonly GuideSection[] = [
  {
    label: 'クイックスタート',
    steps: [
      {
        title: '初回セットアップ（5 分）',
        body: 'Docker Desktop と Python 3.12 がインストール済みであることを確認してから実行します。',
        items: [
          '① setup.bat を実行（Docker · venv · npm install を一括処理）',
          '② Terminal 1: cd backend → .venv\\Scripts\\activate → python run.py',
          '③ Terminal 2: cd frontend → npm run dev',
          '④ ブラウザで http://localhost:3000 を開く',
          '⑤ API Docs: http://localhost:8000/docs',
          '⑥ まずダッシュボードで「ブラウザから撮影」または画像アップロードを試す',
        ],
      },
      {
        title: '推奨利用フロー',
        body: '画像を入力してから処理・検出・学習の順で試すのが最短体験ルートです。',
        items: [
          '撮影 → /camera でブラウザカメラ撮影 or 画像アップロード',
          '前処理 → /preprocess で画像 ID 指定 + 処理選択 → 実行',
          '検出 → /detection でメソッドを選んで実行（まず contour が軽量）',
          '描画 → /annotate で図形を追加して描画実行',
          '学習 → /ml でラベル付き画像を複数枚追加 → 学習開始',
          '推論 → 学習後に画像 ID + モデル ID を指定して推論',
          '確認 → / ダッシュボードで全保存画像と ID を一覧表示',
        ],
      },
      {
        title: 'オプション ML パッケージ',
        body: 'コア機能（sklearn + contour + haar）は requirements.txt に含まれます。TensorFlow / PyTorch / YOLO は追加インストールが必要です。',
        items: [
          'install-ml.bat — TF 2.18 + PyTorch 2.5 + ultralytics YOLOv8 を一括インストール',
          '個別 — install-ml.bat tensorflow / torch / ultralytics',
          '容量 — TensorFlow ~390MB · PyTorch ~203MB · ultralytics 追加',
          'インストール後 — GET /api/ml/frameworks で状態確認',
          '本番 — Railway では requirements-railway.txt のみ使用（ML パッケージ不含）',
          'YOLO モデル — 初回推論時に yolov8n.pt を自動ダウンロード（~6MB）',
        ],
      },
    ],
  },
  {
    label: 'カメラ入力',
    steps: [
      {
        title: 'Web カメラ（ブラウザ）',
        body: 'ブラウザの getUserMedia API を使い、サーバーへは base64 PNG として送信します。HTTPS または localhost でのみ動作します。',
        items: [
          '「カメラ開始」→ ブラウザがカメラ許可を求めます（1度だけ）',
          '「📸 撮影」→ 現在フレームを canvas に描画してサーバーへ送信',
          '保存後 — 画像 ID が発行され、前処理・検出・描画にそのまま使用できます',
          '「停止」→ カメラを解放（バッテリー節約）',
          'エラー時 — カメラ不許可 / 既に別タブが使用中の場合はエラーを表示',
          'Railway 本番 — Web カメラはブラウザ側なので本番でも動作します',
        ],
      },
      {
        title: 'USB カメラ（サーバー側）',
        body: 'ローカル PC にあるサーバーが直接 cv2.VideoCapture でカメラを制御します。Docker や Railway 環境では使用できません。',
        items: [
          'GET /api/camera/devices — 接続可能なデバイス index の一覧を取得',
          'デバイス選択 → ドロップダウンから選択（通常は 0 が内蔵カメラ）',
          '「USB カメラ接続」→ POST /api/camera/open で VideoCapture を開始',
          '「📸 フレーム取得」→ POST /api/camera/capture でフレームを DB に保存',
          '「切断」→ POST /api/camera/close でカメラリソースを解放',
          '明るさ・コントラスト調整 — POST /api/camera/settings',
        ],
      },
    ],
  },
  {
    label: '前処理 詳細',
    steps: [
      {
        title: 'パイプライン実行の仕組み',
        body: 'operations 配列の順番に OpenCV 関数を適用します。前のステップの出力が次のステップの入力になります。',
        items: [
          '例: grayscale → resize → filter → edge の順で指定すると 4 ステップ実行',
          '各ステップ結果は個別の画像 ID として DB に保存される',
          'プレビュー — レスポンスの steps[].preview（base64）で即座に確認できる',
          'final_image_id — 最後のステップの画像 ID（次の処理に使える）',
        ],
      },
      {
        title: 'グレースケール・2値化',
        body: '色情報を落としてノイズ除去・2値化すると、その後のエッジ検出や輪郭検出の精度が上がります。',
        items: [
          'grayscale — BGR→GRAY→BGR。チャンネル数は 3 のまま返る',
          'binarize（otsu）— 大津の二値化。輝度ヒストグラムから自動で閾値を決定',
          'binarize（threshold）— 固定閾値（0〜255）を指定',
          '推奨順 — grayscale → binarize（または grayscale → edge）',
        ],
      },
      {
        title: 'エッジ抽出',
        body: '輪郭や境界を強調する処理です。後段の contour 検出と組み合わせると効果的です。',
        items: [
          'canny — 二重閾値でノイズに強い。low=50 / high=150 がデフォルト',
          'sobel — 水平・垂直方向の勾配を合成。輝度変化を可視化',
          'laplacian — 二次微分。急激な明暗変化（角点）を強調',
          '推奨 — 通常は canny。低コントラスト画像には sobel',
        ],
      },
      {
        title: 'リサイズ・反転・フィルター',
        body: 'ML 学習前の前処理や、ミラー補正・ノイズ除去に使います。',
        items: [
          'resize — interpolation: linear（拡大）/ area（縮小）/ lanczos（高品質）',
          'flip — horizontal（左右反転）/ vertical（上下）/ both（180°回転）',
          'filter(gaussian) — ガウス関数でノイズを滑らかに除去。ksize は奇数で指定',
          'filter(bilateral) — エッジを保持しながらノイズ除去。処理は重め',
          'filter(sharpen) — シャープネスカーネルで輪郭を強調',
          'filter(median) — 塩コショウノイズの除去に有効',
        ],
      },
    ],
  },
  {
    label: 'オブジェクト検出 詳細',
    steps: [
      {
        title: '検出メソッドの選び方',
        body: '用途と環境（ML インストール有無）に応じてメソッドを選択します。',
        items: [
          'contour — 軽量・高速。形状の輪郭・面積フィルタで物体を切り出す',
          'haar — 顔・目・体などの古典的な検出器。追加インストール不要',
          'dnn — MobileNet-SSD。人物・車・犬など 21 クラスを信頼度付きで検出',
          'yolo — YOLOv8n。高精度・多クラス。要 install-ml.bat + 初回ダウンロード',
          '未インストール時 — yolo は dnn に、dnn はモデル未取得時に contour にフォールバック',
        ],
      },
      {
        title: 'Haar Cascade の種別',
        body: 'cascade パラメータで検出対象を切り替えます。OpenCV に同梱のモデルを使用します。',
        items: [
          'face — haarcascade_frontalface_default.xml（正面顔）',
          'eye — haarcascade_eye.xml',
          'fullbody — haarcascade_fullbody.xml',
          'upperbody — haarcascade_upperbody.xml',
          'smile — haarcascade_smile.xml',
          'パラメータ — scaleFactor=1.1 · minNeighbors=5 · minSize=(30,30)',
        ],
      },
      {
        title: '検出結果の読み方',
        body: 'レスポンスの objects 配列と result_url を使って結果を確認します。',
        items: [
          'objects — [{label, confidence, x, y, w, h}, ...] の配列',
          'confidence — DNN / YOLO のみ（0〜1）。contour / haar は 1.0 固定',
          'x, y — 検出ボックスの左上座標（ピクセル）',
          'w, h — 検出ボックスの幅と高さ',
          'result_url — 矩形を描画済みの画像ファイル URL',
          'preview — base64 プレビュー（レスポンス内に含まれる）',
        ],
      },
    ],
  },
  {
    label: '描画処理 詳細',
    steps: [
      {
        title: '図形の指定方法',
        body: 'shapes 配列に複数の図形を渡すと重ね描きされます。type フィールドで図形種別を指定します。',
        items: [
          '色指定 — #rrggbb 形式（例: "#ff0000"）または [R,G,B] 配列',
          'thickness — 線の太さ（px）。-1 を指定すると塗りつぶし',
          '座標 — 画像の左上を原点（0,0）とするピクセル座標',
          '順序 — shapes 配列の後の要素ほど前面に描画される',
        ],
      },
      {
        title: '図形別パラメータ',
        body: '各図形に必要なパラメータの一覧です。',
        items: [
          'rectangle — type: "rectangle", x, y, w, h, color, thickness',
          'circle — type: "circle", cx, cy, radius, color, thickness',
          'line — type: "line", x1, y1, x2, y2, color, thickness',
          'text — type: "text", x, y, text, font_scale, color',
          'polygon — type: "polygon", points: [[x,y],...], color, fill: true/false',
        ],
      },
      {
        title: '描画 UI の使い方',
        body: '/annotate 画面から図形をインタラクティブに追加して、まとめて API 送信できます。',
        items: [
          '+ ボタン — 上部の図形種別ボタンで新しい図形を追加',
          'カラーピッカー — 各図形カードの「色」フィールド',
          '✕ ボタン — 図形の削除',
          '「描画実行」— 全図形を一括で API 送信',
          '結果 — 描画済み画像が「描画結果」カードに表示される',
        ],
      },
    ],
  },
  {
    label: '深層学習 詳細',
    steps: [
      {
        title: '学習データの準備',
        body: 'ラベル分類したい画像をクラスごとに用意します。1クラス最低 10〜20 枚推奨です。',
        items: [
          '例 — cat.jpg × 20 枚（ラベル: "cat"）+ dog.jpg × 20 枚（ラベル: "dog"）',
          '/ml「モデル学習」タブ → 「+ 画像を追加」で複数枚選択',
          '各画像に対応するラベルをテキストフィールドへ入力',
          'モデル名 — わかりやすい名前を設定（例: cats_vs_dogs_v1）',
          'バックエンド — auto / sklearn / tensorflow / pytorch から選択',
          '「学習開始」→ 完了まで数秒〜数分（TF/PT は エポック数に依存）',
        ],
      },
      {
        title: 'バックエンドの違いと精度',
        body: '3 バックエンドは同じ CNN アーキテクチャを持ちますが、特性が異なります。',
        items: [
          'sklearn（HOG + RandomForest）— 高速・軽量。少量データ向け。精度はやや低め',
          'TensorFlow（Conv2D × 2）— GPU なし CPU でも 15エポックで安定した精度',
          'PyTorch（Conv2d × 2）— TF と同等の精度。実装がシンプル',
          'auto（推奨）— TF → PT → sklearn の優先順で自動選択',
          'test_accuracy — 学習後にテストデータでの精度（0.0〜1.0）を表示',
          'データが少ない場合（< 20枚）— sklearn が最も安定',
        ],
      },
      {
        title: '推論の実行',
        body: '「推論」タブで学習済みモデルと画像 ID を指定して推論します。',
        items: [
          '「+ 画像をアップロード」または「画像 ID を直接入力」',
          '「モデル選択」— 保存済みモデルのドロップダウンから選択',
          '「推論実行」→ ラベルと信頼度（0〜100%）を表示',
          '信頼度が低い（< 50%）場合 — 学習データを追加して再学習',
          'GET /api/ml/frameworks — TF · PT のインストール状態確認',
          'GET /api/ml/models — 保存済みモデル一覧',
        ],
      },
    ],
  },
  {
    label: 'トラブルシュート・API',
    steps: [
      {
        title: 'よくあるエラーと対処',
        body: '画面にエラーが表示された場合の確認手順です。',
        items: [
          'Image not found — 画像 ID が存在しない。ダッシュボードで ID を確認',
          'DB 接続エラー — docker compose up -d で PostgreSQL が起動しているか確認',
          'opencv import エラー — pip install opencv-python で再インストール',
          'Cannot open camera — USB カメラが接続されているか · 別アプリが使用中でないか確認',
          'YOLO 初回起動が遅い — yolov8n.pt のダウンロード中（~6MB）。ネットワーク確認',
          'DNN 検出が動かない — MobileNet-SSD の自動ダウンロードが必要（初回のみ）',
          'Railway デプロイ失敗 — Dockerfile の存在 · DATABASE_URL 環境変数を確認',
        ],
      },
      {
        title: 'API エンドポイント一覧（開発者向け）',
        body: '/docs（Swagger UI）から全エンドポイントを試験実行できます。',
        items: [
          'POST /api/images/upload — multipart 画像アップロード',
          'POST /api/images/from-base64 — base64 画像の受信・保存',
          'GET /api/images/{id}/file — 画像バイナリ返却',
          'GET /api/images — 画像一覧（skip / limit）',
          'POST /api/preprocess/{id} — 前処理パイプライン実行',
          'POST /api/detection/{id} — オブジェクト検出',
          'POST /api/annotation/{id} — 描画処理',
          'GET /api/camera/devices — USB カメラデバイス一覧',
          'POST /api/camera/open / capture / close — USB カメラ制御',
          'GET /api/ml/frameworks — TF/PT インストール状態',
          'GET /api/ml/models — 保存済み ML モデル一覧',
          'POST /api/ml/train — CNN モデル学習（multipart）',
          'POST /api/ml/predict/{id}?model_id=N — 推論実行',
          'GET /health — 生存確認 + フレームワーク状態',
        ],
      },
      {
        title: '環境変数（.env）',
        body: '.env.example をコピーして .env を作成します。Railway では環境変数として設定します。',
        items: [
          'POSTGRES_HOST / PORT / USER / PASSWORD / DB — DB 接続情報',
          'DATABASE_URL — 設定時は上記を上書き（Railway 推奨）',
          'UPLOAD_DIR — 画像保存先ディレクトリ（デフォルト: uploads）',
          'MODELS_DIR — ML モデル保存先（デフォルト: models）',
          'MAX_UPLOAD_MB — アップロード上限 MB（デフォルト: 20）',
        ],
      },
    ],
  },
]

const L = {
  title: '利用手順',
  subtitle: 'Image Processing & Ops',
  dragHint: 'ドラッグで移動',
  expand: '開く',
  collapse: '閉じる',
  heroTitle: 'ImageProcessing',
  heroLead:
    'OpenCV × FastAPI × Next.js による画像処理プラットフォーム。前処理・検出・描画・深層学習を Web UI から直感的に操作できます。',
  stackLabel: 'Tech stack',
  diagramLabel: 'Service topology',
  workflowLabel: '詳細利用手順',
  scrollHint: '↓ 機能別の詳細手順は下へ',
  footer:
    '▼▲ で開閉 · PC はヘッダーをドラッグして移動 · 表示状態は自動保存されます。',
} as const

type SavedState = { x: number; y: number; expanded: boolean }

function defaultPosition(mobile = false) {
  if (typeof window === 'undefined') return { x: 24, y: 24 }
  if (mobile || window.innerWidth < 768)
    return { x: 8, y: Math.max(72, window.innerHeight - 72) }
  const x = Math.max(16, window.innerWidth - PANEL_WIDTH - 24)
  const y = Math.max(72, window.innerHeight - 520)
  return { x, y }
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(8, window.innerWidth - width - 8)
  const maxY = Math.max(8, window.innerHeight - height - 8)
  return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) }
}

function FeaturedSection({ block }: { block: FeaturedBlock }) {
  const variant = block.variant ?? 'default'
  return (
    <section className={`usage-guide-featured usage-guide-featured--${variant}`} aria-label={block.title}>
      <div className="usage-guide-featured-head">
        <span className="usage-guide-featured-badge">{block.badge}</span>
        <strong>{block.title}</strong>
      </div>
      <p>{block.body}</p>
      {block.items?.length ? (
        <ul className="usage-guide-items">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </section>
  )
}

export function UsageGuidePanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number; startX: number; startY: number; originX: number; originY: number
  } | null>(null)

  const [ready, setReady] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [pos, setPos] = useState({ x: 24, y: 24 })
  const [dragging, setDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SavedState
        setPos(mobile ? defaultPosition(true) : { x: parsed.x, y: parsed.y })
        setExpanded(mobile ? false : parsed.expanded)
      } catch {
        setPos(defaultPosition(mobile))
        if (mobile) setExpanded(false)
      }
    } else {
      setPos(defaultPosition(mobile))
      if (mobile) setExpanded(false)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pos, expanded }))
  }, [pos, expanded, ready])

  useEffect(() => {
    if (!ready) return
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) return
      const el = panelRef.current
      if (!el) return
      setPos((cur) => clampPosition(cur.x, cur.y, el.offsetWidth, el.offsetHeight))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ready])

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (isMobile) return
    if ((e.target as HTMLElement).closest('.usage-guide-toggle')) return
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pos.x, pos.y, isMobile])

  const onHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const el = panelRef.current
    setPos(clampPosition(drag.originX + (e.clientX - drag.startX), drag.originY + (e.clientY - drag.startY), el?.offsetWidth ?? PANEL_WIDTH, el?.offsetHeight ?? 120))
  }, [])

  const onHeaderPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  if (!ready) return null

  return (
    <div
      ref={panelRef}
      className={`usage-guide-panel${expanded ? ' is-expanded' : ' is-collapsed'}${dragging ? ' is-dragging' : ''}${isMobile ? ' is-mobile' : ''}`}
      style={isMobile ? undefined : { left: pos.x, top: pos.y, width: PANEL_WIDTH }}
      role="dialog"
      aria-label={L.title}
      aria-modal="false"
    >
      <header
        className="usage-guide-header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <div className="usage-guide-header-text">
          <span className="usage-guide-drag-icon" aria-hidden>☰</span>
          <div className="usage-guide-header-titles">
            <strong>{L.title}</strong>
            <span className="usage-guide-header-sub">{L.subtitle}</span>
          </div>
          <span className="usage-guide-drag-hint">{L.dragHint}</span>
        </div>
        <button
          type="button"
          className="usage-guide-toggle"
          aria-label={expanded ? L.collapse : L.expand}
          aria-expanded={expanded}
          onClick={() => setExpanded((o) => !o)}
        >
          {expanded ? '▼' : '▲'}
        </button>
      </header>

      {expanded ? (
        <div className="usage-guide-body">
          <div className="usage-guide-hero">
            <p className="usage-guide-hero-kicker">Image Processing Platform</p>
            <h2 className="usage-guide-hero-title">{L.heroTitle}</h2>
            <p className="usage-guide-hero-lead">{L.heroLead}</p>
            <div className="usage-guide-stack" aria-label={L.stackLabel}>
              {techStack.map((tag) => (
                <span key={tag} className="usage-guide-stack-pill">{tag}</span>
              ))}
            </div>
          </div>

          <FeaturedSection block={architectureFeatured} />

          <figure className="usage-guide-diagram" aria-label={L.diagramLabel}>
            <figcaption>{L.diagramLabel}</figcaption>
            <pre>{archDiagram}</pre>
          </figure>

          <FeaturedSection block={opencvFeatured} />
          <FeaturedSection block={preprocessFeatured} />
          <FeaturedSection block={detectionFeatured} />
          <FeaturedSection block={annotateFeatured} />
          <FeaturedSection block={cameraFeatured} />
          <FeaturedSection block={dlFeatured} />
          <FeaturedSection block={deployFeatured} />

          <p className="usage-guide-scroll-hint">{L.scrollHint}</p>
          <h3 className="usage-guide-workflow-title">{L.workflowLabel}</h3>

          {guideSections.map((section) => (
            <div key={section.label} className="usage-guide-section">
              <p className="usage-guide-section-label">{section.label}</p>
              <ol className="usage-guide-steps">
                {section.steps.map((step) => (
                  <li key={step.title}>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                    {step.items?.length ? (
                      <ul className="usage-guide-items">
                        {step.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}

          <p className="usage-guide-footer">{L.footer}</p>
        </div>
      ) : null}
    </div>
  )
}
