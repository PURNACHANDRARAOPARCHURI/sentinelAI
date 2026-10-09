import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="analyst", nullable=False)  # analyst, investigator, admin, auditor
    full_name = Column(String(150), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    amount = Column(Float, nullable=False)
    tx_type = Column(String(50), nullable=False, index=True) # TRANSFER, CASH_OUT, PAYMENT, DEBIT, CASH_IN
    sender_account = Column(String(64), nullable=False, index=True)
    receiver_account = Column(String(64), nullable=False, index=True)
    step = Column(Integer, default=1)
    location = Column(String(100), nullable=True)
    device_id = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    
    # Financial state
    oldbalance_org = Column(Float, default=0.0)
    newbalance_orig = Column(Float, default=0.0)
    oldbalance_dest = Column(Float, default=0.0)
    newbalance_dest = Column(Float, default=0.0)
    
    # Risk scoring
    xgboost_prob = Column(Float, nullable=True)
    isolation_forest_score = Column(Float, nullable=True)
    initial_risk_score = Column(Float, nullable=False)
    agent_risk_score = Column(Float, nullable=True)
    final_risk_score = Column(Float, nullable=False)
    
    # Decision & workflow state
    decision = Column(String(50), nullable=False) # APPROVE, STEP_UP_AUTH, HUMAN_REVIEW, REJECT
    status = Column(String(50), default="APPROVED") # APPROVED, OTP_PENDING, OTP_VERIFIED, IN_REVIEW, REJECTED
    escalated_to_agents = Column(Boolean, default=False)
    
    # Inference metrics
    latency_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    investigation = relationship("AgentInvestigation", back_populates="transaction", uselist=False)
    review_case = relationship("HumanReviewCase", back_populates="transaction", uselist=False)

class AgentInvestigation(Base):
    __tablename__ = "agent_investigations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    transaction_id = Column(String(36), ForeignKey("transactions.id"), unique=True, nullable=False)
    
    # Agent 1: Behavioral
    behavioral_score = Column(Float, default=0.0)
    behavioral_explanation = Column(Text, nullable=True)
    behavioral_indicators = Column(JSON, nullable=True)
    
    # Agent 2: Transaction Context
    context_category = Column(String(100), nullable=True)
    context_score = Column(Float, default=0.0)
    context_explanation = Column(Text, nullable=True)
    
    # Agent 3: RAG Policy Retrieval
    rag_score = Column(Float, default=0.0)
    rag_citations = Column(JSON, nullable=True)
    rag_explanation = Column(Text, nullable=True)
    
    # Agent 4: Investigation Summary
    summary_text = Column(Text, nullable=True)
    
    # Aggregated & Evaluator
    aggregated_agent_score = Column(Float, default=0.0)
    guardrail_status = Column(String(50), default="PASSED")
    guardrail_violations = Column(JSON, nullable=True)
    
    # Open-weight Evaluator Output
    llm_recommendation = Column(String(50), nullable=True)
    llm_risk_summary = Column(Text, nullable=True)
    contradictions = Column(JSON, nullable=True)
    missing_evidence = Column(JSON, nullable=True)
    
    # Latencies
    latency_breakdown_ms = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    transaction = relationship("Transaction", back_populates="investigation")

class HumanReviewCase(Base):
    __tablename__ = "human_review_cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    transaction_id = Column(String(36), ForeignKey("transactions.id"), unique=True, nullable=False)
    status = Column(String(50), default="PENDING", index=True) # PENDING, APPROVED, REJECTED
    priority = Column(String(50), default="HIGH") # MEDIUM, HIGH, CRITICAL
    assigned_to = Column(String(100), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    transaction = relationship("Transaction", back_populates="review_case")

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    transaction_id = Column(String(36), ForeignKey("transactions.id"), nullable=False)
    otp_code = Column(String(10), nullable=False)
    channel = Column(String(20), default="SMS")
    recipient = Column(String(100), nullable=False)
    attempts = Column(Integer, default=0)
    verified = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor = Column(String(100), nullable=False) # system, username
    action = Column(String(100), nullable=False) # TRANSACTION_EVALUATED, OTP_REQUESTED, OTP_VERIFIED, CASE_APPROVED, CASE_REJECTED
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(64), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class PolicyDocument(Base):
    __tablename__ = "policy_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    source_ref = Column(String(100), nullable=False) # e.g. RBI/2017-18/15
    category = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
