import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SentinelAI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = "sentinel_ai_super_secret_jwt_key_enterprise_2026_banking_system"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    
    # Database
    DATABASE_URL: str = "sqlite:///./sentinelai.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Core ML Ensemble Weights & Initial Threshold
    XGBOOST_WEIGHT: float = 0.70
    ISOLATION_FOREST_WEIGHT: float = 0.30
    INITIAL_RISK_THRESHOLD: float = 0.30
    
    # Decision Engine Thresholds
    LOW_RISK_THRESHOLD: float = 0.30
    HIGH_RISK_THRESHOLD: float = 0.70
    
    # Multi-Agent Weights (LangGraph)
    BEHAVIORAL_AGENT_WEIGHT: float = 0.30
    CONTEXT_AGENT_WEIGHT: float = 0.25
    RAG_AGENT_WEIGHT: float = 0.25
    SUMMARY_AGENT_WEIGHT: float = 0.20
    
    # Timeouts & Concurrency
    AGENT_TIMEOUT_SECONDS: float = 4.0
    ENABLE_PARALLEL_AGENTS: bool = True
    
    # OTP & Notifications
    MOCK_OTP_MODE: bool = True
    OTP_EXPIRY_SECONDS: int = 300
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "fraud-alerts@sentinelai.bank"
    
    # Guardrails
    ENABLE_GUARDRAILS: bool = True
    ENABLE_PRESIDIO_PII_MASKING: bool = True

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
