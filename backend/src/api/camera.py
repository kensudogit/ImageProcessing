"""USB カメラ制御 API"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db.database import Image, get_db
from src.services.camera_service import camera_service
from src.services.image_io import save_ndarray
from src.utils.opencv_codec import ndarray_to_base64

router = APIRouter(prefix="/api/camera", tags=["camera"])


class OpenRequest(BaseModel):
    device_index: int = 0
    width: int = 640
    height: int = 480
    fps: int = 30


class CameraSettings(BaseModel):
    brightness: float | None = None
    contrast: float | None = None
    saturation: float | None = None
    exposure: float | None = None
    gain: float | None = None


@router.get("/devices")
def list_devices():
    try:
        devices = camera_service.list_devices()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"devices": devices}


@router.post("/open")
def open_camera(body: OpenRequest):
    try:
        info = camera_service.open(body.device_index, body.width, body.height, body.fps)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "opened", **info}


@router.post("/capture")
def capture_frame(db: Session = Depends(get_db)):
    try:
        frame = camera_service.capture()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    meta = save_ndarray(frame, source="usb")
    meta["filename"] = "capture_usb.png"
    img = Image(**meta)
    db.add(img)
    db.commit()
    db.refresh(img)

    return {
        "image_id": img.id,
        "url": f"/api/images/{img.id}/file",
        "preview": ndarray_to_base64(frame),
        "width": img.width,
        "height": img.height,
    }


@router.post("/settings")
def update_settings(body: CameraSettings):
    params = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        applied = camera_service.update_settings(params)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"applied": applied}


@router.post("/close")
def close_camera():
    camera_service.close()
    return {"status": "closed"}


@router.get("/status")
def camera_status():
    return {"is_open": camera_service.is_open}
