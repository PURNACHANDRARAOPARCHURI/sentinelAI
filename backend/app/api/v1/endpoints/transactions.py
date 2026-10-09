import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models.db_models import Transaction, AgentInvestigation
from backend.app.models.schemas import (
    TransactionCreate, TransactionResponse, TransactionDetailResponse,
    OTPRequest, OTPResponse, OTPVerify
)
from backend.app.ml.initial_aggregator import initial_risk_aggregator
from backend.app.agents.orchestrator import orchestrator
from backend.app.decision.engine import decision_engine
from backend.app.decision.otp_service import otp_service

router = APIRouter()

@router.post("/analyze", response_model=TransactionDetailResponse)
def analyze_transaction(tx_in: TransactionCreate, db: Session = Depends(get_db)):
    """
    Core Entrypoint: Analyzes a new financial transaction in real-time.
    1. Feature Engineering & Core ML Scoring (XGBoost + Isolation Forest)
    2. Initial Risk Aggregation
    3. Branch: Fast Approval Path (< 0.30) vs LangGraph Multi-Agent Parallel Investigation (> 0.30)
    4. Deterministic Decision Engine & Database Ledger Persistence
    """
    tx_dict = tx_in.model_dump()
    tx_dict["id"] = str(uuid.uuid4())

    # Step 1 & 2: Initial ML Risk Evaluation
    initial_res = initial_risk_aggregator.evaluate_initial_risk(tx_dict)
    
    # Step 3: Branch Decision
    multi_agent_state = None
    if initial_res.get("needs_escalation"):
        # Escalate to LangGraph Multi-Agent Orchestration
        multi_agent_state = orchestrator.run_investigation(
            tx_data=tx_dict,
            initial_risk=initial_res
        )

    # Step 4: Decision Engine Policy & Persistence
    tx_record = decision_engine.process_decision(
        tx_data=tx_dict,
        initial_risk=initial_res,
        multi_agent_state=multi_agent_state,
        db=db,
        actor="system_auto_analysis"
    )

    return TransactionDetailResponse.model_validate(tx_record)

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    min_risk: Optional[float] = Query(None, ge=0.0, le=1.0),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves paginated historical transactions with optional filtering."""
    query = db.query(Transaction)
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
    if type_filter:
        query = query.filter(Transaction.tx_type == type_filter.upper())
    if min_risk is not None:
        query = query.filter(Transaction.final_risk_score >= min_risk)
    if search:
        s = f"%{search}%"
        query = query.filter((Transaction.sender_account.like(s)) | (Transaction.receiver_account.like(s)) | (Transaction.id.like(s)))

    return query.order_by(desc(Transaction.created_at)).offset(skip).limit(limit).all()

@router.get("/{transaction_id}", response_model=TransactionDetailResponse)
def get_transaction_detail(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return TransactionDetailResponse.model_validate(tx)

@router.post("/otp/request", response_model=OTPResponse)
def request_step_up_otp(otp_in: OTPRequest, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == otp_in.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    result = otp_service.generate_otp(
        transaction_id=tx.id,
        recipient=tx.sender_account,
        db=db,
        channel=otp_in.channel or "SMS"
    )
    return OTPResponse(
        transaction_id=tx.id,
        message=result["message"],
        channel=result["channel"],
        mock_otp=result.get("mock_otp"),
        expires_in_seconds=result["expires_in_seconds"]
    )

@router.post("/otp/verify")
def verify_step_up_otp(verify_in: OTPVerify, db: Session = Depends(get_db)):
    success, msg = otp_service.verify_otp(
        transaction_id=verify_in.transaction_id,
        raw_code=verify_in.otp_code,
        db=db
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    # Transition transaction status
    tx = db.query(Transaction).filter(Transaction.id == verify_in.transaction_id).first()
    if tx:
        tx.status = "APPROVED"
        tx.decision = "APPROVE"
        db.commit()

    return {"status": "SUCCESS", "message": msg, "transaction_id": verify_in.transaction_id}
