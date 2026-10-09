import os
import glob
import time
from pathlib import Path
from typing import Dict, Any, List
from backend.app.agents.state import AgentResult

class RAGEvidenceRetrievalAgent:
    """
    Agent 3: RAG Evidence Retrieval Agent
    Retrieves authoritative banking policies, RBI circulars, and internal fraud rules
    relevant to the transaction's parameters.
    """
    def __init__(self):
        self.name = "RAG Evidence Retrieval Agent"
        self.documents = []
        self._load_documents()

    def _load_documents(self):
        docs_dir = Path(__file__).resolve().parent.parent / "rag" / "documents"
        if not docs_dir.exists():
            return
            
        md_files = glob.glob(str(docs_dir / "*.md"))
        for fpath in md_files:
            fname = os.path.basename(fpath)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Chunk by H3/H4 headers
            sections = content.split("### ")
            for sec in sections:
                if not sec.strip():
                    continue
                lines = sec.strip().split("\n")
                header = lines[0].replace("#", "").strip()
                body = "\n".join(lines[1:]).strip()
                self.documents.append({
                    "file": fname,
                    "title": header,
                    "content": body,
                    "full_text": f"{header}\n{body}"
                })

    def retrieve(self, tx: Dict[str, Any]) -> AgentResult:
        t0 = time.time()
        amount = float(tx.get("amount", 0.0))
        old_orig = float(tx.get("oldbalance_org", 0.0) if tx.get("oldbalance_org") is not None else amount)
        new_orig = float(tx.get("newbalance_orig", 0.0) if tx.get("newbalance_orig") is not None else 0.0)
        step = int(tx.get("step", 1))
        hour = step % 24
        desc = str(tx.get("description", "")).lower()

        retrieved_citations = []
        risk_score = 0.15
        
        # Policy Rule 1: Account Depletion & Deficit Rule AD-01
        is_deficit = bool(amount > old_orig)
        depletion_ratio = amount / (old_orig + 1.0)
        if is_deficit or (depletion_ratio >= 0.85 and old_orig > 5000) or (new_orig == 0 and old_orig > 10000):
            for doc in self.documents:
                if "AD-01" in doc["title"] or "Account Depletion" in doc["title"]:
                    retrieved_citations.append({
                        "policy": doc["file"],
                        "section": doc["title"],
                        "relevance_score": 0.96,
                        "excerpt": "Outgoing amount depletes or exceeds existing ledger balance. Immediate freeze or mandatory analyst escalation required."
                    })
                    risk_score = max(risk_score, 0.90 if is_deficit else 0.85)

        # Policy Rule 2: RBI Master Direction - Large Value & Mule Account Monitoring
        if amount >= 500000 or "mule" in desc or "commission" in desc:
            for doc in self.documents:
                if "Mule Account" in doc["title"] or "KYC" in doc["title"]:
                    retrieved_citations.append({
                        "policy": doc["file"],
                        "section": doc["title"],
                        "relevance_score": 0.93,
                        "excerpt": "High-value transfers exceeding standard thresholds or exhibiting rapid layering require mandatory enhanced due diligence (EDD)."
                    })
                    risk_score = max(risk_score, 0.85 if amount >= 1000000 else 0.75)

        # Policy Rule 3: Off-Hours Nocturnal Rule OH-02
        if (hour >= 23 or hour <= 5) and amount >= 50000:
            for doc in self.documents:
                if "OH-02" in doc["title"] or "Off-Hours" in doc["title"]:
                    retrieved_citations.append({
                        "policy": doc["file"],
                        "section": doc["title"],
                        "relevance_score": 0.87,
                        "excerpt": "Transaction initiated between 23:00 and 05:00 exceeding standard velocity threshold. Step-up MFA/OTP required."
                    })
                    risk_score = max(risk_score, 0.65)

        # Policy Rule 4: RBI Customer Liability Circular (2017-18/15)
        if not retrieved_citations:
            for doc in self.documents:
                if "Zero Liability" in doc["title"] or "Customer Protection" in doc["title"]:
                    retrieved_citations.append({
                        "policy": doc["file"],
                        "section": doc["title"],
                        "relevance_score": 0.72,
                        "excerpt": "Standard electronic banking transaction with SMS/email notification compliance."
                    })
                    break

        lat_ms = (time.time() - t0) * 1000.0
        
        if len(retrieved_citations) > 0 and risk_score >= 0.6:
            explanation = f"Matched {len(retrieved_citations)} regulatory & internal policies indicating potential non-compliance or heightened liability risk."
        else:
            explanation = "Transaction conforms with standard RBI transaction thresholds; no regulatory violation flags identified."

        return AgentResult(
            agent_name=self.name,
            risk_score=round(risk_score, 4),
            confidence=0.90 if retrieved_citations else 0.50,
            status="SUCCESS",
            explanation=explanation,
            evidence=retrieved_citations,
            latency_ms=round(lat_ms, 2)
        )

rag_agent = RAGEvidenceRetrievalAgent()
