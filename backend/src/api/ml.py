"""深層学習 API"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.config import settings
from src.db.database import Image, MlModel, MlPrediction, get_db
from src.services.deep_learning import (
    check_frameworks,
    predict,
    resolve_backend,
    save_model_bundle,
    train_model,
)
from src.services.image_io import load_ndarray
from src.utils.opencv_codec import bytes_to_ndarray

router = APIRouter(prefix="/api/ml", tags=["ml"])


@router.get("/frameworks")
def get_frameworks():
    return {
        "frameworks": check_frameworks(),
        "active_backend": resolve_backend(),
    }


@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    models = db.query(MlModel).order_by(MlModel.created_at.desc()).all()
    return {"models": [
        {
            "id": m.id, "name": m.name, "backend": m.backend,
            "labels": m.labels, "metrics": m.metrics,
            "created_at": m.created_at.isoformat(),
        }
        for m in models
    ]}


@router.post("/train")
async def train(
    name: str = Form(...),
    backend: str = Form("auto"),
    files: list[UploadFile] = File(...),
    labels: str = Form(...),  # JSON array of label strings matching files
    db: Session = Depends(get_db),
):
    label_list: list[str] = json.loads(labels)
    if len(label_list) != len(files):
        raise HTTPException(status_code=422, detail="files and labels must have the same length")

    images = []
    for f in files:
        data = await f.read()
        images.append(bytes_to_ndarray(data))

    bundle = train_model(images, label_list, backend=backend)

    model_dir = settings.models_path / "ml"
    safe_name = name.replace(" ", "_")
    model_path = save_model_bundle(bundle, model_dir, safe_name)

    ml_model = MlModel(
        name=name,
        backend=bundle["backend"],
        labels=bundle["labels"],
        metrics={"test_accuracy": bundle.get("test_accuracy")},
        model_path=str(model_path),
    )
    db.add(ml_model)
    db.commit()
    db.refresh(ml_model)

    return {
        "model_id": ml_model.id,
        "name": name,
        "backend": bundle["backend"],
        "labels": bundle["labels"],
        "test_accuracy": bundle.get("test_accuracy"),
    }


@router.post("/predict/{image_id}")
def predict_image(
    image_id: int,
    model_id: int,
    db: Session = Depends(get_db),
):
    img_rec = db.get(Image, image_id)
    ml_model = db.get(MlModel, model_id)
    if not img_rec:
        raise HTTPException(status_code=404, detail="Image not found")
    if not ml_model:
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        img = load_ndarray(img_rec.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image file not found")

    result = predict(img, ml_model.model_path, ml_model.backend, ml_model.labels or [])

    pred = MlPrediction(
        model_id=model_id,
        image_id=image_id,
        label=result["label"],
        confidence=result["confidence"],
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)

    return {
        "prediction_id": pred.id,
        "image_id": image_id,
        "model_id": model_id,
        "label": result["label"],
        "confidence": result["confidence"],
        "backend": result["backend"],
    }
