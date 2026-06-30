# ImageProcessing

Python + FastAPI + PostgreSQL + Next.js による OpenCV 画像処理プラットフォーム。

## 技術スタック

| 層 | 採用技術 |
|----|---------|
| Backend | Python 3.12, FastAPI, uvicorn, SQLAlchemy 2, psycopg3 |
| 画像処理 | OpenCV 4.10, NumPy, Pillow |
| 機械学習 | scikit-learn（コア）+ TensorFlow 2.18 / PyTorch 2.5（オプション）|
| Frontend | Next.js 16, React 19, TypeScript |
| DB | PostgreSQL 16（Docker） |

---

## セットアップ

### 前提条件

- [Python 3.12](https://www.python.org/downloads/) (`py -3.12 --version` で確認)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 18+](https://nodejs.org/) (`node --version` で確認)

### 一括セットアップ

```bat
cd C:\devlop\ImageProcessing
setup.bat
```

内部処理:
1. `docker compose up -d` — PostgreSQL 16 起動 (port 5434)
2. `backend\install.bat` — Python 3.12 venv + コア依存インストール
3. `.env.example` → `.env` コピー
4. `frontend\npm install`

### 起動

```bat
# Terminal 1: バックエンド
cd backend
.venv\Scripts\activate
python run.py
# → http://localhost:8000 / API Docs: http://localhost:8000/docs

# Terminal 2: フロントエンド
cd frontend
npm run dev
# → http://localhost:3000
```

---

## 機能一覧

### 1. 画像の入出力・カメラ設定

| 機能 | 説明 |
|------|------|
| ファイルアップロード | PNG/JPEG/BMP をアップロード、PostgreSQL に保存 |
| Web カメラ | ブラウザの `getUserMedia` でキャプチャ |
| USB カメラ | OpenCV `VideoCapture` でサーバー側カメラを制御 |

**USB カメラ API:**

```
GET  /api/camera/devices          利用可能デバイス一覧
POST /api/camera/open             カメラ接続 {device_index, width, height, fps}
POST /api/camera/capture          フレーム取得 → 画像として保存
POST /api/camera/settings         {brightness, contrast, exposure, ...}
POST /api/camera/close            解放
```

> USB カメラはサーバー側（ローカル実行）でのみ動作します。クラウドデプロイ時は Web カメラを使用してください。

---

### 2. 画像の前処理

`POST /api/preprocess/{image_id}` で複数操作をパイプライン実行:

| operation | パラメータ | 処理 |
|-----------|-----------|------|
| `grayscale` | — | グレースケール化 |
| `binarize` | `method: otsu\|threshold`, `threshold: 0-255` | 2値化 |
| `edge` | `method: canny\|sobel\|laplacian`, `low, high` | エッジ抽出 |
| `resize` | `width, height, interpolation` | リサイズ |
| `flip` | `mode: horizontal\|vertical\|both` | 反転 |
| `color_convert` | `code: hsv\|lab\|rgb\|gray\|yuv\|xyz\|hls` | 色変換 |
| `filter` | `type: blur\|gaussian\|median\|bilateral\|sharpen`, `ksize` | フィルター処理 |

---

### 3. オブジェクト検出

`POST /api/detection/{image_id}` でメソッドを切替:

| method | 実装 | 用途 |
|--------|------|------|
| `contour` | `cv2.findContours` | 形状・輪郭 |
| `haar` | `cv2.CascadeClassifier` | 顔・目・体（古典） |
| `dnn` | OpenCV DNN + MobileNet-SSD | 21クラス DL 検出 |
| `yolo` | YOLOv8n (ultralytics) | 高精度 DL (要 install-ml) |

---

### 4. 画像への描画処理

`POST /api/annotation/{image_id}` で shapes リストを指定:

| type | パラメータ |
|------|-----------|
| `rectangle` | x, y, w, h, color, thickness |
| `circle` | cx, cy, radius, color |
| `line` | x1, y1, x2, y2, color |
| `text` | x, y, text, font_scale, color |
| `polygon` | points[], color, fill |

---

### 5. 深層学習 (CNN 分類)

```
POST /api/ml/train                  ラベル付き画像でモデル学習
POST /api/ml/predict/{image_id}     推論
GET  /api/ml/models                 保存済みモデル一覧
GET  /api/ml/frameworks             TF/PyTorch インストール状態
```

**バックエンド優先順位:** TensorFlow → PyTorch → sklearn（自動フォールバック）

---

## オプション: TensorFlow / PyTorch / YOLO インストール

```bat
cd backend
install-ml.bat
# 個別インストール:
# install-ml.bat tensorflow
# install-ml.bat torch
# install-ml.bat ultralytics
```

> 約 600MB〜。安定したネットワーク環境で実行してください。

---

## テスト

```bat
cd backend
.venv\Scripts\activate
pytest tests/ -q
```

テストファイル:

| ファイル | 内容 |
|---------|------|
| `test_preprocessing.py` | 前処理 7種 + パイプライン |
| `test_annotation.py` | 描画形状 |
| `test_image_io.py` | アップロード・base64 往復 |
| `test_object_detection.py` | Contour/Haar 検出 |
| `test_camera_service.py` | VideoCapture モック |
| `test_ml_deep_learning.py` | sklearn/TF/PT 学習 |

---

## ディレクトリ構成

```
ImageProcessing/
├── backend/
│   ├── src/
│   │   ├── main.py           FastAPI エントリ
│   │   ├── config.py         設定 (pydantic-settings)
│   │   ├── db/database.py    SQLAlchemy ORM
│   │   ├── api/              エンドポイント
│   │   ├── services/         ビジネスロジック (OpenCV)
│   │   └── utils/            opencv_codec
│   ├── db/init.sql
│   ├── tests/
│   ├── uploads/              保存画像 (gitignore)
│   ├── models/               DL モデル重み (gitignore)
│   ├── requirements.txt
│   ├── requirements-ml.txt
│   ├── install.bat / install-ml.bat
│   └── run.py
├── frontend/
│   ├── app/                  Next.js App Router
│   │   ├── page.tsx          ダッシュボード
│   │   ├── camera/           カメラ入力
│   │   ├── preprocess/       前処理
│   │   ├── detection/        オブジェクト検出
│   │   ├── annotate/         描画
│   │   └── ml/               深層学習
│   ├── components/           共通コンポーネント
│   ├── lib/api.ts            fetch クライアント
│   └── next.config.ts        /api/* → FastAPI リライト
├── docker-compose.yml        PostgreSQL 16 (port 5434)
├── setup.bat
└── .env.example
```

---

## 環境変数

`.env` ファイル（`.env.example` をコピーして編集）:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_USER=imgproc_user
POSTGRES_PASSWORD=imgproc_password
POSTGRES_DB=imgproc_db

UPLOAD_DIR=uploads
MODELS_DIR=models
MAX_UPLOAD_MB=20
```
