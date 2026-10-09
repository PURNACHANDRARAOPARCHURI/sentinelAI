from typing import TypedDict, Dict, Any, List, Optional

class AgentResult(TypedDict, total=False):
    agent_name: str
    risk_score: float
    confidence: float
    status: str
    explanation: str
    evidence: Optional[Any]
    latency_ms: float
    error: Optional[str]

class InvestigationState(TypedDict, total=False):
    transaction_id: str
    transaction: Dict[str, Any]
    initial_risk: Dict[str, Any]
    
    # 4 Parallel Agent Results
    behavioral_result: AgentResult
    context_result: AgentResult
    rag_result: AgentResult
    summary_result: AgentResult
    
    # Aggregated & Evaluated
    aggregated_agent_score: float
    guardrail_result: Dict[str, Any]
    evaluator_result: Dict[str, Any]
    final_decision: Dict[str, Any]
    
    errors: List[str]
    latency_breakdown_ms: Dict[str, float]
