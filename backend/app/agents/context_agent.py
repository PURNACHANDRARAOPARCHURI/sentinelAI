import time
import re
from typing import Dict, Any, Tuple
from backend.app.agents.state import AgentResult

HIGH_RISK_PATTERNS = {
    "CRYPTO_PURCHASE": {
        "keywords": ["crypto", "bitcoin", "btc", "usdt", "binance", "wazirx", "coin", "p2p", "bybit", "token"],
        "risk": 0.85,
        "desc": "Cryptocurrency or virtual asset exchange transfer"
    },
    "SUSPICIOUS_MULE_PAYOUT": {
        "keywords": ["commission", "mule", "task payment", "telegram task", "cashback refund", "investment double"],
        "risk": 0.90,
        "desc": "High probability money mule or task-based scam typology"
    },
    "URGENT_UNVERIFIED_WIRE": {
        "keywords": ["urgent", "immediate wire", "emergency medical", "confidential fee", "customs clearance", "bail"],
        "risk": 0.78,
        "desc": "Urgent unverified transfer with social-engineering distress keywords"
    },
    "GAMBLING_CASINO": {
        "keywords": ["casino", "bet365", "stake", "roulette", "poker", "dream11", "lottery"],
        "risk": 0.70,
        "desc": "Online gaming, betting or speculative wagering platform"
    },
    "STANDARD_COMMERCE": {
        "keywords": ["amazon", "flipkart", "grocery", "supermarket", "electricity", "water", "bill", "recharge", "zomato", "swiggy", "uber"],
        "risk": 0.05,
        "desc": "Verified merchant utility or consumer retail purchase"
    },
    "ROUTINE_PEER_TRANSFER": {
        "keywords": ["rent", "salary", "dinner", "split", "family", "lunch", "reimbursement", "office", "travel"],
        "risk": 0.08,
        "desc": "Regular peer-to-peer personal or living expense transfer"
    }
}

class TransactionContextAgent:
    """
    Agent 2: Transaction Context Classification Agent
    Classifies narrative, merchant category, and intent using NLP keywords & semantic matching.
    """
    def __init__(self):
        self.name = "Transaction Context Classification Agent"

    def analyze(self, tx: Dict[str, Any]) -> AgentResult:
        t0 = time.time()
        desc = tx.get("description")
        
        if not desc or not desc.strip():
            lat_ms = (time.time() - t0) * 1000.0
            return AgentResult(
                agent_name=self.name,
                risk_score=0.20,
                confidence=0.50,
                status="NO_NARRATIVE",
                explanation="No narrative or description provided with transaction. Defaulting to neutral baseline risk.",
                evidence={"category": "UNSPECIFIED", "matched_keywords": []},
                latency_ms=round(lat_ms, 2)
            )

        text_lower = desc.strip().lower()
        matched_cat = "GENERAL_TRANSFER"
        matched_risk = 0.25
        matched_keywords = []
        explanation = f"General transaction memo: '{desc}'."

        for cat_name, info in HIGH_RISK_PATTERNS.items():
            found = [kw for kw in info["keywords"] if re.search(r'\b' + re.escape(kw) + r'\b', text_lower)]
            if found:
                matched_cat = cat_name
                matched_risk = info["risk"]
                matched_keywords = found
                explanation = f"Classified context as {cat_name} ({info['desc']}). Matched terms: {found}."
                break

        lat_ms = (time.time() - t0) * 1000.0
        return AgentResult(
            agent_name=self.name,
            risk_score=round(matched_risk, 4),
            confidence=0.88 if matched_keywords else 0.65,
            status="SUCCESS",
            explanation=explanation,
            evidence={
                "category": matched_cat,
                "matched_keywords": matched_keywords,
                "original_text": desc
            },
            latency_ms=round(lat_ms, 2)
        )

context_agent = TransactionContextAgent()
