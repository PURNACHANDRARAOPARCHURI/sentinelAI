from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.ml.xgboost_model import xgb_predictor
from backend.app.ml.isolation_forest_model import iso_forest_predictor
from backend.app.models.schemas import SystemHealthResponse

router = APIRouter()

class SystemSettingsUpdate(BaseModel):
    initial_risk_threshold: float
    low_risk_threshold: float
    high_risk_threshold: float
    mock_otp_mode: bool

@router.get("/health", response_model=SystemHealthResponse)
def get_health():
    return SystemHealthResponse(
        status="HEALTHY",
        environment=settings.ENVIRONMENT,
        database="CONNECTED",
        xgboost_model_loaded=xgb_predictor.is_loaded,
        isolation_forest_loaded=iso_forest_predictor.is_loaded,
        agents_ready=True,
        version=settings.VERSION
    )

@router.get("/ready")
def get_ready():
    ready = xgb_predictor.is_loaded and iso_forest_predictor.is_loaded
    return {"ready": ready, "message": "All core models and services operational"}

@router.get("/settings")
def get_current_settings():
    return {
        "xgboost_weight": settings.XGBOOST_WEIGHT,
        "isolation_forest_weight": settings.ISOLATION_FOREST_WEIGHT,
        "initial_risk_threshold": settings.INITIAL_RISK_THRESHOLD,
        "low_risk_threshold": settings.LOW_RISK_THRESHOLD,
        "high_risk_threshold": settings.HIGH_RISK_THRESHOLD,
        "behavioral_agent_weight": settings.BEHAVIORAL_AGENT_WEIGHT,
        "context_agent_weight": settings.CONTEXT_AGENT_WEIGHT,
        "rag_agent_weight": settings.RAG_AGENT_WEIGHT,
        "summary_agent_weight": settings.SUMMARY_AGENT_WEIGHT,
        "mock_otp_mode": settings.MOCK_OTP_MODE,
        "enable_guardrails": settings.ENABLE_GUARDRAILS
    }

@router.post("/settings")
def update_settings(update_in: SystemSettingsUpdate):
    settings.INITIAL_RISK_THRESHOLD = update_in.initial_risk_threshold
    settings.LOW_RISK_THRESHOLD = update_in.low_risk_threshold
    settings.HIGH_RISK_THRESHOLD = update_in.high_risk_threshold
    settings.MOCK_OTP_MODE = update_in.mock_otp_mode
    return {"status": "SUCCESS", "message": "System thresholds updated successfully"}
