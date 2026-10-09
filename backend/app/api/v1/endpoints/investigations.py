from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models.db_models import HumanReviewCase, Transaction, AuditLog
from backend.app.models.schemas import ReviewCaseResponse, ReviewAction

router = APIRouter()

@router.get("", response_model=List[ReviewCaseResponse])
def get_review_cases(
    status_filter: Optional[str] = Query("PENDING", alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(HumanReviewCase)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(HumanReviewCase.status == status_filter.upper())
    
    cases = query.order_by(desc(HumanReviewCase.created_at)).all()
    results = []
    for c in cases:
        tx_data = None
        if c.transaction:
            tx_data = {
                "id": c.transaction.id,
                "amount": c.transaction.amount,
                "tx_type": c.transaction.tx_type,
                "sender_account": c.transaction.sender_account,
                "receiver_account": c.transaction.receiver_account,
                "location": c.transaction.location,
                "device_id": c.transaction.device_id,
                "description": c.transaction.description,
                "xgboost_prob": c.transaction.xgboost_prob,
                "isolation_forest_score": c.transaction.isolation_forest_score,
                "initial_risk_score": c.transaction.initial_risk_score,
                "agent_risk_score": c.transaction.agent_risk_score,
                "final_risk_score": c.transaction.final_risk_score,
                "decision": c.transaction.decision,
                "status": c.transaction.status,
                "escalated_to_agents": c.transaction.escalated_to_agents,
                "latency_ms": c.transaction.latency_ms,
                "created_at": c.transaction.created_at
            }
        results.append({
            "id": c.id,
            "transaction_id": c.transaction_id,
            "status": c.status,
            "priority": c.priority,
            "assigned_to": c.assigned_to,
            "reviewer_notes": c.reviewer_notes,
            "reviewed_at": c.reviewed_at,
            "created_at": c.created_at,
            "transaction": tx_data
        })
    return results

@router.post("/{case_id}/review")
def submit_human_review(
    case_id: str,
    review_in: ReviewAction,
    db: Session = Depends(get_db)
):
    case = db.query(HumanReviewCase).filter(HumanReviewCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Review case not found")
        
    action_upper = review_in.action.upper()
    if action_upper not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Action must be APPROVE or REJECT")

    case.status = "APPROVED" if action_upper == "APPROVE" else "REJECTED"
    case.reviewer_notes = review_in.notes
    case.reviewed_at = datetime.now(timezone.utc)
    case.assigned_to = "analyst_reviewer"

    # Update associated transaction status
    if case.transaction:
        case.transaction.status = "APPROVED" if action_upper == "APPROVE" else "REJECTED"
        case.transaction.decision = "APPROVE" if action_upper == "APPROVE" else "REJECT"

    # Write audit log
    audit = AuditLog(
        actor="analyst_reviewer",
        action=f"HUMAN_REVIEW_{action_upper}",
        resource_type="CASE",
        resource_id=case.id,
        details={
            "transaction_id": case.transaction_id,
            "notes": review_in.notes,
            "action": action_upper
        }
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "case_id": case.id, "decision": action_upper}
