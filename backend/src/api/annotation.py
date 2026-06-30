"""描画処理 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import Annotation, Image, get_db
from src.services.annotation import draw_shapes
from src.services.image_io import load_ndarray, save_ndarray
from src.utils.opencv_codec import ndarray_to_base64

router = APIRouter(prefix="/api/annotation", tags=["annotation"])


class AnnotationRequest(BaseModel):
    shapes: list[dict]


@router.post("/{image_id}")
def annotate(image_id: int, body: AnnotationRequest, db: Session = Depends(get_db)):
    img_rec = db.get(Image, image_id)
    if not img_rec:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        img = load_ndarray(img_rec.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    annotated = draw_shapes(img, body.shapes)

    meta = save_ndarray(annotated, source="annotation")
    meta["filename"] = f"ann_{img_rec.filename}"
    meta["parent_id"] = image_id
    result_img = Image(**meta)
    db.add(result_img)
    db.flush()

    ann = Annotation(image_id=image_id, shapes=body.shapes, result_image_id=result_img.id)
    db.add(ann)
    db.commit()

    return {
        "image_id": image_id,
        "shape_count": len(body.shapes),
        "result_image_id": result_img.id,
        "result_url": f"/api/images/{result_img.id}/file",
        "preview": ndarray_to_base64(annotated),
    }
