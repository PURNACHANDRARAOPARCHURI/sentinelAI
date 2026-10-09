import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.db_models import Transaction, AgentInvestigation, HumanReviewCase, AuditLog
from backend.app.guardrails.pii_sanitizer import pii_sanitizer
from backend.app.decision.otp_service import otp_service

logger = logging.getLogger(__name__)

class DecisionEngine:
    """
    Section 10: Decision Engine (Policy & Authorization)
    Executes banking policy rules over final risk scores and multi-agent findings:
    - Low Risk (< 0.30): Instant Core Banking Approval
    - Medium Risk (0.30 <= Score < 0.70): Step-up OTP Authentication
    - High Risk (Score >= 0.70): Human-in-the-Loop Analyst Escalation
    """
    def __init__(self):
        self.low_threshold = settings.LOW_RISK_THRESHOLD
        self.high_threshold = settings.HIGH_RISK_THRESHOLD

    def process_decision(
        self,
        tx_data: Dict[str, Any],
        initial_risk: Dict[str, Any],
        multi_agent_state: Optional[Dict[str, Any]],
        db: Session,
        actor: str = "system"
    ) -> Transaction:
        t0 = time.time()
        
        # Determine whether transaction took the fast path or multi-agent path
        is_escalated = bool(multi_agent_state is not None)
        init_score = float(initial_risk.get("initial_risk_score", 0.0))
        
        if is_escalated:
            eval_res = multi_agent_state.get("evaluator_result", {})
            final_score = float(eval_res.get("final_risk_score", init_score))
            agent_score = float(multi_agent_state.get("aggregated_agent_score", init_score))
        else:
            final_score = init_score
            agent_score = None

        # Tri-state decision logic
        if final_score < self.low_threshold:
            decision = "APPROVE"
            status = "APPROVED"
        elif final_score < self.high_threshold:
            decision = "STEP_UP_AUTH"
            status = "OTP_PENDING"
        else:
            decision = "HUMAN_REVIEW"
            status = "IN_REVIEW"

        # Create or update Transaction record
        tx_id = tx_data.get("id")
        amount = float(tx_data.get("amount", 0.0))
        old_orig = float(tx_data.get("oldbalance_org", 0.0) if tx_data.get("oldbalance_org") is not None else amount)
        new_orig = float(tx_data.get("newbalance_orig", 0.0) if tx_data.get("newbalance_orig") is not None else max(0.0, old_orig - amount))
        old_dest = float(tx_data.get("oldbalance_dest", 0.0) if tx_data.get("oldbalance_dest") is not None else 0.0)
        new_dest = float(tx_data.get("newbalance_dest", 0.0) if tx_data.get("newbalance_dest") is not None else old_dest + amount)

        total_lat = (time.time() - t0) * 1000.0 + initial_risk.get("latency_ms", 0.0)
        if is_escalated:
            total_lat += multi_agent_state.get("latency_breakdown_ms", {}).get("total_multi_agent_ms", 0.0)

        tx_record = Transaction(
            id=tx_id,
            amount=amount,
            tx_type=str(tx_data.get("tx_type", "TRANSFER")).upper(),
            sender_account=str(tx_data.get("sender_account")),
            receiver_account=str(tx_data.get("receiver_account")),
            step=int(tx_data.get("step", 1)),
            location=tx_data.get("location"),
            device_id=tx_data.get("device_id"),
            description=tx_data.get("description"),
            oldbalance_org=old_orig,
            newbalance_orig=new_orig,
            oldbalance_dest=old_dest,
            newbalance_dest=new_dest,
            xgboost_prob=initial_risk.get("xgboost_prob"),
            isolation_forest_score=initial_risk.get("isolation_forest_score"),
            initial_risk_score=init_score,
            agent_risk_score=agent_score,
            final_risk_score=final_score,
            decision=decision,
            status=status,
            escalated_to_agents=is_escalated,
            latency_ms=round(total_lat, 2)
        )
        db.add(tx_record)
        db.flush()

        # If escalated, persist AgentInvestigation entity
        if is_escalated:
            b_res = multi_agent_state.get("behavioral_result", {})
            c_res = multi_agent_state.get("context_result", {})
            r_res = multi_agent_state.get("rag_result", {})
            s_res = multi_agent_state.get("summary_result", {})
            g_res = multi_agent_state.get("guardrail_result", {})
            eval_res = multi_agent_state.get("evaluator_result", {})

            investigation = AgentInvestigation(
                transaction_id=tx_record.id,
                behavioral_score=b_res.get("risk_score", 0.0),
                behavioral_explanation=b_res.get("explanation"),
                behavioral_indicators=b_res.get("evidence"),
                context_category=c_res.get("evidence", {}).get("category"),
                context_score=c_res.get("risk_score", 0.0),
                context_explanation=c_res.get("explanation"),
                rag_score=r_res.get("risk_score", 0.0),
                rag_citations=r_res.get("evidence"),
                rag_explanation=r_res.get("explanation"),
                summary_text=s_res.get("explanation"),
                aggregated_agent_score=multi_agent_state.get("aggregated_agent_score", 0.0),
                guardrail_status=eval_res.get("guardrail_status", "PASSED"),
                guardrail_violations=g_res.get("violations"),
                llm_recommendation=eval_res.get("recommendation"),
                llm_risk_summary=eval_res.get("risk_summary"),
                contradictions=eval_res.get("contradictions"),
                missing_evidence=eval_res.get("missing_evidence"),
                latency_breakdown_ms=multi_agent_state.get("latency_breakdown_ms")
            )
            db.add(investigation)

        # If HIGH RISK, queue for human review
        if decision == "HUMAN_REVIEW":
            priority = "CRITICAL" if final_score >= 0.85 else "HIGH"
            review_case = HumanReviewCase(
                transaction_id=tx_record.id,
                status="PENDING",
                priority=priority,
                assigned_to=None,
                reviewer_notes=None
            )
            db.add(review_case)

        # If STEP_UP_AUTH, generate OTP
        if decision == "STEP_UP_AUTH":
            recipient = tx_data.get("sender_account", "customer@bank.internal")
            otp_service.generate_otp(
                transaction_id=tx_record.id,
                recipient=recipient,
                db=db,
                channel="SMS"
            )

        # Audit Log entry (scrubbed PII)
        audit_details = {
            "amount": amount,
            "decision": decision,
            "status": status,
            "final_risk_score": final_score,
            "escalated": is_escalated
        }
        audit_entry = AuditLog(
            actor=actor,
            action=f"TRANSACTION_DECISION_{decision}",
            resource_type="TRANSACTION",
            resource_id=tx_record.id,
            details=audit_details
        )
        db.add(audit_entry)

        db.commit()
        db.refresh(tx_record)
        return tx_record

decision_engine = DecisionEngine()
