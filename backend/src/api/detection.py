"""オブジェクト検出 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import DetectionResult, Image, get_db
from src.services.image_io import load_ndarray, save_ndarray
from src.services.object_detection import run_detection
from src.utils.opencv_codec import ndarray_to_base64

router = APIRouter(prefix="/api/detection", tags=["detection"])


class DetectionRequest(BaseModel):
    method: str = "contour"  # contour | haar | dnn | yolo
    min_area: int = 500
    confidence_threshold: float = 0.5
    cascade: str = "face"


@router.post("/{image_id}")
def detect(image_id: int, body: DetectionRequest, db: Session = Depends(get_db)):
    img_rec = db.get(Image, image_id)
    if not img_rec:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        img = load_ndarray(img_rec.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    try:
        boxes, annotated = run_detection(
            img, body.method,
            min_area=body.min_area,
            confidence_threshold=body.confidence_threshold,
            cascade=body.cascade,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    meta = save_ndarray(annotated, source="detection")
    meta["filename"] = f"det_{body.method}_{img_rec.filename}"
    meta["parent_id"] = image_id
    result_img = Image(**meta)
    db.add(result_img)
    db.flush()

    det = DetectionResult(
        image_id=image_id,
        method=body.method,
        objects=boxes,
        result_image_id=result_img.id,
    )
    db.add(det)
    db.commit()

    return {
        "image_id": image_id,
        "method": body.method,
        "objects": boxes,
        "count": len(boxes),
        "result_image_id": result_img.id,
        "result_url": f"/api/images/{result_img.id}/file",
        "preview": ndarray_to_base64(annotated),
    }
