from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[str] = "analyst"
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    full_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# Transaction schemas
class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount")
    tx_type: str = Field(..., description="Transaction type (TRANSFER, CASH_OUT, PAYMENT, DEBIT, CASH_IN)")
    sender_account: str = Field(..., min_length=4, description="Sender Account identifier")
    receiver_account: str = Field(..., min_length=4, description="Receiver Account identifier")
    location: Optional[str] = Field(None, description="Transaction geolocation")
    device_id: Optional[str] = Field(None, description="Sender Device ID")
    description: Optional[str] = Field(None, description="Transaction narrative or memo")
    
    # Optional balance context if provided by caller, else simulated/inferred
    oldbalance_org: Optional[float] = Field(None, description="Sender initial balance")
    newbalance_orig: Optional[float] = Field(None, description="Sender new balance")
    oldbalance_dest: Optional[float] = Field(None, description="Receiver initial balance")
    newbalance_dest: Optional[float] = Field(None, description="Receiver new balance")
    step: Optional[int] = Field(14, description="Simulation step / hour (defaults to business hour 14)")

class TransactionResponse(BaseModel):
    id: str
    amount: float
    tx_type: str
    sender_account: str
    receiver_account: str
    location: Optional[str]
    device_id: Optional[str]
    description: Optional[str]
    
    # Model scores
    xgboost_prob: Optional[float]
    isolation_forest_score: Optional[float]
    initial_risk_score: float
    agent_risk_score: Optional[float]
    final_risk_score: float
    
    # Decision
    decision: str
    status: str
    escalated_to_agents: bool
    latency_ms: float
    created_at: datetime

    class Config:
        from_attributes = True

class AgentDetailResponse(BaseModel):
    behavioral_score: float
    behavioral_explanation: Optional[str]
    behavioral_indicators: Optional[Dict[str, Any]]
    
    context_category: Optional[str]
    context_score: float
    context_explanation: Optional[str]
    
    rag_score: float
    rag_citations: Optional[List[Dict[str, Any]]]
    rag_explanation: Optional[str]
    
    summary_text: Optional[str]
    
    aggregated_agent_score: float
    guardrail_status: str
    guardrail_violations: Optional[List[str]]
    
    llm_recommendation: Optional[str]
    llm_risk_summary: Optional[str]
    contradictions: Optional[List[str]]
    missing_evidence: Optional[List[str]]
    latency_breakdown_ms: Optional[Dict[str, float]]

    class Config:
        from_attributes = True

class TransactionDetailResponse(TransactionResponse):
    investigation: Optional[AgentDetailResponse] = None

# OTP schemas
class OTPRequest(BaseModel):
    transaction_id: str
    channel: Optional[str] = "SMS" # SMS or EMAIL

class OTPResponse(BaseModel):
    transaction_id: str
    message: str
    channel: str
    mock_otp: Optional[str] = None # Visible only in development mock mode
    expires_in_seconds: int

class OTPVerify(BaseModel):
    transaction_id: str
    otp_code: str

# Human Review schemas
class ReviewAction(BaseModel):
    action: str = Field(..., description="APPROVE or REJECT")
    notes: Optional[str] = Field("", description="Reviewer forensic notes")

class ReviewCaseResponse(BaseModel):
    id: str
    transaction_id: str
    status: str
    priority: str
    assigned_to: Optional[str]
    reviewer_notes: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    transaction: Optional[TransactionResponse] = None

    class Config:
        from_attributes = True

# Dashboard & Analytics schemas
class DashboardSummary(BaseModel):
    total_transactions: int
    detected_fraud_count: int
    fraud_detection_rate: float
    false_positive_rate: float
    high_risk_count: int
    pending_review_count: int
    average_latency_ms: float
    p95_latency_ms: float

class RiskTrendItem(BaseModel):
    timestamp: str
    total_tx: int
    fraud_tx: int
    avg_risk: float

class RiskDistributionBucket(BaseModel):
    range: str
    count: int
    percentage: float

class SystemHealthResponse(BaseModel):
    status: str
    environment: str
    database: str
    xgboost_model_loaded: bool
    isolation_forest_loaded: bool
    agents_ready: bool
    version: str
