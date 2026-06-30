"""ImageProcessing API — FastAPI エントリポイント"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from src.api.annotation import router as annotation_router
from src.api.camera import router as camera_router
from src.api.detection import router as detection_router
from src.api.images import router as images_router
from src.api.ml import router as ml_router
from src.api.preprocess import router as preprocess_router
from src.config import settings
from src.db.database import init_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    yield


app = FastAPI(
    title="ImageProcessing API",
    description="OpenCV 画像処理・オブジェクト検出・深層学習 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(images_router)
app.include_router(preprocess_router)
app.include_router(detection_router)
app.include_router(annotation_router)
app.include_router(camera_router)
app.include_router(ml_router)


@app.get("/health")
def health():
    from src.services.deep_learning import check_frameworks
    return {
        "status": "ok",
        "ml_frameworks": check_frameworks(),
    }


@app.get("/", response_class=HTMLResponse)
def root():
    return """<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=/docs">
<title>ImageProcessing API</title></head>
<body><p>ImageProcessing API — <a href="/docs">API Docs</a></p></body></html>"""
