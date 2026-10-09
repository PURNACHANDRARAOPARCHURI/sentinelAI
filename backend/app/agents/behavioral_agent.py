import time
import numpy as np
from typing import Dict, Any
from backend.app.agents.state import AgentResult

class BehavioralAnalysisAgent:
    """
    Agent 1: Behavioral Analysis Agent
    Analyzes historical velocity, balance depletion shock, time-of-day anomalies,
    and account spending patterns.
    """
    def __init__(self):
        self.name = "Behavioral Analysis Agent"

    def analyze(self, tx: Dict[str, Any]) -> AgentResult:
        t0 = time.time()
        amount = float(tx.get("amount", 0.0))
        old_orig = float(tx.get("oldbalance_org", 0.0) if tx.get("oldbalance_org") is not None else amount)
        new_orig = float(tx.get("newbalance_orig", 0.0) if tx.get("newbalance_orig") is not None else 0.0)
        step = int(tx.get("step", 1))
        hour = step % 24
        
        indicators = {}
        risk_components = []
        
        # 1. Balance depletion shock & Deficit detection
        is_deficit = bool(amount > old_orig)
        depletion_ratio = amount / (old_orig + 1.0)
        indicators["depletion_ratio"] = round(depletion_ratio, 2)
        indicators["is_deficit"] = is_deficit
        
        if is_deficit:
            risk_components.append((f"Attempted transfer (INR {amount:,.0f}) exceeds available ledger balance (INR {old_orig:,.0f}) — unauthorized deficit/overdraft attempt", 0.45))
            indicators["critical_depletion"] = True
        elif depletion_ratio >= 0.90 and old_orig >= 10000:
            risk_components.append(("Critical balance depletion (>90% of funds drained)", 0.40))
            indicators["critical_depletion"] = True
        elif depletion_ratio >= 0.60:
            risk_components.append(("High balance depletion", 0.20))
            indicators["critical_depletion"] = False

        # 2. Complete balance zeroing
        if (new_orig == 0.0 and old_orig >= 20000) or is_deficit:
            risk_components.append(("Origin account completely zeroed out after high-value transfer", 0.30))
            indicators["account_wiped"] = True
            
        # 3. Off-hours nocturnal activity
        if hour >= 23 or hour <= 5:
            risk_components.append((f"Off-hours nocturnal transfer initiated at hour {hour}:00", 0.20))
            indicators["off_hours"] = True
        else:
            indicators["off_hours"] = False
            
        # 4. Large transfer value velocity
        if amount >= 5000000:
            risk_components.append(("Extreme monetary magnitude (INR 50,00,000+) carries critical institutional exposure", 0.40))
            indicators["large_transfer"] = True
        elif amount >= 1000000:
            risk_components.append(("High-value monetary velocity (INR 10,00,000+) exceeds standard wire limits", 0.30))
            indicators["large_transfer"] = True
        elif amount >= 500000:
            risk_components.append(("Monetary magnitude exceeds standard velocity threshold (INR 5,00,000+)", 0.25))
            indicators["large_transfer"] = True
        elif amount >= 200000:
            risk_components.append(("Monetary magnitude above normal tier (INR 2,00,000+)", 0.15))
            indicators["large_transfer"] = True
        else:
            indicators["large_transfer"] = False

        # Compute combined behavioral risk score
        base_risk = 0.05
        for _, weight in risk_components:
            base_risk += weight
            
        final_risk = float(np.clip(base_risk, 0.0, 1.0))
        
        # Format explanation
        if risk_components:
            reasons = "; ".join([r[0] for r in risk_components])
            explanation = f"Elevated behavioral risk detected: {reasons}."
        else:
            explanation = "Normal account activity: Transaction amount aligns with account balance and regular business hours."
            
        confidence = 0.92 if len(risk_components) >= 2 else 0.85
        lat_ms = (time.time() - t0) * 1000.0

        return AgentResult(
            agent_name=self.name,
            risk_score=round(final_risk, 4),
            confidence=confidence,
            status="SUCCESS",
            explanation=explanation,
            evidence=indicators,
            latency_ms=round(lat_ms, 2)
        )

behavioral_agent = BehavioralAnalysisAgent()
