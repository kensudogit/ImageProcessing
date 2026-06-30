"""データベース接続・モデル定義"""
from __future__ import annotations

import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from src.config import settings


class Base(DeclarativeBase):
    pass


class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(32), default="upload")  # upload | webcam | usb
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    mime: Mapped[str] = mapped_column(String(64), default="image/png")
    storage_path: Mapped[str] = mapped_column(String(512))
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("images.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("images.id"))
    operation: Mapped[str] = mapped_column(String(64))
    params: Mapped[dict | None] = mapped_column(JSON)
    result_image_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("images.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("images.id"))
    method: Mapped[str] = mapped_column(String(32))  # contour | haar | dnn | yolo
    objects: Mapped[list | None] = mapped_column(JSON)
    result_image_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("images.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class Annotation(Base):
    __tablename__ = "annotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("images.id"))
    shapes: Mapped[list | None] = mapped_column(JSON)
    result_image_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("images.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class MlModel(Base):
    __tablename__ = "ml_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    backend: Mapped[str] = mapped_column(String(32))  # sklearn | tensorflow | pytorch
    labels: Mapped[list | None] = mapped_column(JSON)
    metrics: Mapped[dict | None] = mapped_column(JSON)
    model_path: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class MlPrediction(Base):
    __tablename__ = "ml_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_id: Mapped[int] = mapped_column(Integer, ForeignKey("ml_models.id"))
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("images.id"))
    label: Mapped[str | None] = mapped_column(String(128))
    confidence: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


engine = create_engine(settings.get_database_url(), echo=False)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_database() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
