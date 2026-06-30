"""前処理 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import Image, ProcessingJob, get_db
from src.services.image_io import load_ndarray, save_ndarray
from src.services.preprocessing import run_pipeline
from src.utils.opencv_codec import ndarray_to_base64

router = APIRouter(prefix="/api/preprocess", tags=["preprocess"])


class PreprocessRequest(BaseModel):
    operations: list[dict]


@router.post("/{image_id}")
def preprocess_image(image_id: int, body: PreprocessRequest, db: Session = Depends(get_db)):
    img_rec = db.get(Image, image_id)
    if not img_rec:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        img = load_ndarray(img_rec.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    try:
        steps = run_pipeline(img, body.operations)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    results = []
    last_result_id = None

    for step in steps:
        meta = save_ndarray(step["img"], source="processed")
        meta["filename"] = f"proc_{step['operation']}_{img_rec.filename}"
        meta["parent_id"] = image_id
        new_img = Image(**meta)
        db.add(new_img)
        db.flush()

        job = ProcessingJob(
            image_id=image_id,
            operation=step["operation"],
            result_image_id=new_img.id,
        )
        db.add(job)
        last_result_id = new_img.id
        results.append({
            "operation": step["operation"],
            "result_image_id": new_img.id,
            "preview": ndarray_to_base64(step["img"]),
            "url": f"/api/images/{new_img.id}/file",
        })

    db.commit()
    return {"image_id": image_id, "steps": results, "final_image_id": last_result_id}
