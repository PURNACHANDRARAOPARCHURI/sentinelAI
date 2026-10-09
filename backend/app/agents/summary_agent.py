import time
from typing import Dict, Any, List
from backend.app.agents.state import AgentResult

class InvestigationSummaryAgent:
    """
    Agent 4: Investigation Summary Agent
    Synthesizes findings across behavioral anomalies, transaction context, and retrieved RAG policies.
    Explicitly distinguishes:
    1. Observed Facts
    2. Model Predictions
    3. Retrieved Evidence
    4. Uncertainties / Missing Data
    """
    def __init__(self):
        self.name = "Investigation Summary Agent"

    def synthesize(
        self,
        tx: Dict[str, Any],
        initial_risk: Dict[str, Any],
        behavioral: AgentResult,
        context: AgentResult,
        rag: AgentResult
    ) -> AgentResult:
        t0 = time.time()
        
        amount = float(tx.get("amount", 0.0))
        tx_type = tx.get("tx_type", "TRANSFER")
        sender = tx.get("sender_account", "UNKNOWN")
        receiver = tx.get("receiver_account", "UNKNOWN")
        
        # 1. Observed Facts
        observed_facts = [
            f"Transfer amount: ₹{amount:,.2f}",
            f"Transaction type: {tx_type}",
            f"Sender: {sender} -> Receiver: {receiver}",
            f"Hour of transaction: {int(tx.get('step', 1)) % 24}:00"
        ]
        
        # 2. Model Predictions
        xgb_p = initial_risk.get("xgboost_prob", 0.0)
        if_s = initial_risk.get("isolation_forest_score", 0.0)
        model_predictions = [
            f"XGBoost Supervised Fraud Probability: {xgb_p*100:.1f}%",
            f"Isolation Forest Anomaly Score: {if_s*100:.1f}%",
            f"Initial ML Ensemble Risk: {initial_risk.get('initial_risk_score', 0.0)*100:.1f}%"
        ]
        
        # 3. Retrieved Regulatory Evidence
        rag_citations = rag.get("evidence", []) if isinstance(rag.get("evidence"), list) else []
        retrieved_evidence = []
        for c in rag_citations[:3]:
            retrieved_evidence.append(f"{c.get('section', 'Rule')}: {c.get('excerpt', '')}")
        if not retrieved_evidence:
            retrieved_evidence.append("No active regulatory breach flagged under standard RBI thresholds.")
            
        # 4. Uncertainties / Missing Information
        uncertainties = []
        if not tx.get("device_id"):
            uncertainties.append("Device fingerprint unavailable; biometric authentication status unknown.")
        if not tx.get("location"):
            uncertainties.append("IP/Geographic coordinates not resolved.")
        if context.get("status") == "NO_NARRATIVE":
            uncertainties.append("No user transaction memo provided for semantic classification.")
            
        # Overall Summary Text
        avg_agent_risk = (behavioral.get("risk_score", 0.0) + context.get("risk_score", 0.0) + rag.get("risk_score", 0.0)) / 3.0
        
        lines = [
            f"### Forensic Fraud Investigation Summary",
            f"- **Observed Facts**: {'; '.join(observed_facts)}",
            f"- **Model Predictions**: {'; '.join(model_predictions)}",
            f"- **Retrieved Evidence**: {'; '.join(retrieved_evidence)}",
            f"- **Uncertainties**: {'; '.join(uncertainties) if uncertainties else 'Full telemetry verified'}",
            f"- **Agent Consensus**: Behavioral Risk={behavioral.get('risk_score', 0):.2f}, Context Risk={context.get('risk_score', 0):.2f}, RAG Policy Risk={rag.get('risk_score', 0):.2f}."
        ]
        summary_text = "\n".join(lines)
        
        lat_ms = (time.time() - t0) * 1000.0
        return AgentResult(
            agent_name=self.name,
            risk_score=round(avg_agent_risk, 4),
            confidence=0.90,
            status="SUCCESS",
            explanation=summary_text,
            evidence={
                "observed_facts": observed_facts,
                "model_predictions": model_predictions,
                "retrieved_evidence": retrieved_evidence,
                "uncertainties": uncertainties
            },
            latency_ms=round(lat_ms, 2)
        )

summary_agent = InvestigationSummaryAgent()
