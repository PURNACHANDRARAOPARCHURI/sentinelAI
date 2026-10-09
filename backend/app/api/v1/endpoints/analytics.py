from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from backend.app.core.database import get_db
from backend.app.models.db_models import Transaction

router = APIRouter()

@router.get("/risk")
def get_risk_analytics(db: Session = Depends(get_db)):
    """Comprehensive risk analytics and volume breakdown."""
    total = db.query(Transaction).count()
    
    # Types breakdown
    type_counts = db.query(Transaction.tx_type, func.count(Transaction.id), func.avg(Transaction.final_risk_score)).group_by(Transaction.tx_type).all()
    types_breakdown = [
        {"type": t[0], "count": t[1], "avg_risk": round(float(t[2] or 0), 2)}
        for t in type_counts
    ]

    # Decisions breakdown
    dec_counts = db.query(Transaction.decision, func.count(Transaction.id)).group_by(Transaction.decision).all()
    decision_breakdown = [
        {"decision": d[0], "count": d[1], "percentage": round((d[1]/total)*100, 1) if total > 0 else 0}
        for d in dec_counts
    ]

    # Threshold sensitivity curve (simulation)
    thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    sensitivity = []
    for th in thresholds:
        flagged = db.query(Transaction).filter(Transaction.final_risk_score >= th).count()
        sensitivity.append({
            "threshold": th,
            "flagged_count": flagged,
            "flagged_percentage": round((flagged / total) * 100, 1) if total > 0 else 0
        })

    return {
        "total_transactions": total,
        "types_breakdown": types_breakdown,
        "decision_breakdown": decision_breakdown,
        "threshold_sensitivity": sensitivity
    }
