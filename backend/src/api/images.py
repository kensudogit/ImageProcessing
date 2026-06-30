"""画像入出力 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import Image, get_db
from src.services.image_io import load_bytes, save_bytes, save_ndarray
from src.utils.opencv_codec import base64_to_ndarray

router = APIRouter(prefix="/api/images", tags=["images"])


class Base64Upload(BaseModel):
    data: str  # data URI or raw base64
    source: str = "webcam"
    filename: str = "capture.png"


def _image_meta(img: Image) -> dict:
    return {
        "id": img.id,
        "filename": img.filename,
        "source": img.source,
        "width": img.width,
        "height": img.height,
        "mime": img.mime,
        "created_at": img.created_at.isoformat(),
        "url": f"/api/images/{img.id}/file",
    }


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    source: str = "upload",
    db: Session = Depends(get_db),
):
    data = await file.read()
    meta = save_bytes(data, original_name=file.filename or "upload.png", source=source)
    img = Image(**meta)
    db.add(img)
    db.commit()
    db.refresh(img)
    return _image_meta(img)


@router.post("/from-base64")
def upload_base64(body: Base64Upload, db: Session = Depends(get_db)):
    img_arr = base64_to_ndarray(body.data)
    meta = save_ndarray(img_arr, source=body.source)
    meta["filename"] = body.filename
    img = Image(**meta)
    db.add(img)
    db.commit()
    db.refresh(img)
    return _image_meta(img)


@router.get("")
def list_images(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    images = db.query(Image).order_by(Image.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(Image).count()
    return {"total": total, "images": [_image_meta(i) for i in images]}


@router.get("/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)):
    img = db.get(Image, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return _image_meta(img)


@router.get("/{image_id}/file")
def get_image_file(image_id: int, db: Session = Depends(get_db)):
    img = db.get(Image, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        data = load_bytes(img.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found on disk")
    return Response(content=data, media_type=img.mime or "image/png")


@router.delete("/{image_id}")
def delete_image(image_id: int, db: Session = Depends(get_db)):
    img = db.get(Image, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    import os
    try:
        os.remove(img.storage_path)
    except FileNotFoundError:
        pass
    db.delete(img)
    db.commit()
    return {"deleted": image_id}
