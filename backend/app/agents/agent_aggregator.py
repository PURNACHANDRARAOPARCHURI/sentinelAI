import logging
import numpy as np
from typing import Dict, Any
from backend.app.core.config import settings
from backend.app.agents.state import AgentResult

logger = logging.getLogger(__name__)

class AgentRiskAggregator:
    """
    Section 7: Agent Risk Aggregator (All Agent Scores)
    Combines risk scores from all LangGraph agents using configurable weights
    and evidence confidence factors into an Aggregated Agent Risk Score in [0, 1].
    """
    def __init__(self):
        self.w_behavioral = settings.BEHAVIORAL_AGENT_WEIGHT
        self.w_context = settings.CONTEXT_AGENT_WEIGHT
        self.w_rag = settings.RAG_AGENT_WEIGHT
        self.w_summary = settings.SUMMARY_AGENT_WEIGHT

    def aggregate(
        self,
        behavioral: AgentResult,
        context: AgentResult,
        rag: AgentResult,
        summary: AgentResult
    ) -> float:
        scores = [
            (self.w_behavioral, behavioral.get("confidence", 0.8), behavioral.get("risk_score", 0.0)),
            (self.w_context, context.get("confidence", 0.8), context.get("risk_score", 0.0)),
            (self.w_rag, rag.get("confidence", 0.8), rag.get("risk_score", 0.0)),
            (self.w_summary, summary.get("confidence", 0.8), summary.get("risk_score", 0.0)),
        ]
        
        weighted_sum = 0.0
        weight_total = 0.0
        for w, conf, score in scores:
            effective_w = w * conf
            weighted_sum += effective_w * score
            weight_total += effective_w
            
        if weight_total <= 0:
            return 0.50
            
        aggregated_score = float(weighted_sum / weight_total)
        return float(np.clip(round(aggregated_score, 4), 0.0, 1.0))

agent_risk_aggregator = AgentRiskAggregator()
