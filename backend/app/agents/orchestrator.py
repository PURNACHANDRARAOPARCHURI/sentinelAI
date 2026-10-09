import time
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any

from backend.app.agents.state import InvestigationState, AgentResult
from backend.app.agents.behavioral_agent import behavioral_agent
from backend.app.agents.context_agent import context_agent
from backend.app.agents.rag_agent import rag_agent
from backend.app.agents.summary_agent import summary_agent
from backend.app.agents.agent_aggregator import agent_risk_aggregator
from backend.app.guardrails.safety_rails import safety_guardrails
from backend.app.evaluator.llm_evaluator import llm_evaluator

logger = logging.getLogger(__name__)

class MultiAgentOrchestrator:
    """
    Section 6: LangGraph Parallel Multi-Agent Orchestrator
    Coordinates execution of Behavioral, Context, RAG Evidence, and Summary Agents.
    Executes independent agents concurrently for minimal end-to-end latency.
    """
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)

    def run_investigation(self, tx_data: Dict[str, Any], initial_risk: Dict[str, Any]) -> InvestigationState:
        t0 = time.time()
        latencies: Dict[str, float] = {}

        # 1. Guardrail Input Safety Validation
        t_guard = time.time()
        is_safe, violations = safety_guardrails.validate_input(tx_data)
        guardrail_result = {
            "is_safe": is_safe,
            "violations": violations
        }
        latencies["guardrails_input_ms"] = round((time.time() - t_guard) * 1000.0, 2)

        # 2. Parallel Execution of Independent Agents (Behavioral, Context, RAG)
        # Using ThreadPool for bounded parallel execution
        t_agents = time.time()
        future_b = self.executor.submit(behavioral_agent.analyze, tx_data)
        future_c = self.executor.submit(context_agent.analyze, tx_data)
        future_r = self.executor.submit(rag_agent.retrieve, tx_data)

        res_behavioral = future_b.result()
        res_context = future_c.result()
        res_rag = future_r.result()
        latencies["parallel_agents_ms"] = round((time.time() - t_agents) * 1000.0, 2)

        # 3. Agent 4: Investigation Summary Agent (Dependent on 1, 2, 3)
        t_summary = time.time()
        res_summary = summary_agent.synthesize(
            tx=tx_data,
            initial_risk=initial_risk,
            behavioral=res_behavioral,
            context=res_context,
            rag=res_rag
        )
        latencies["summary_agent_ms"] = round((time.time() - t_summary) * 1000.0, 2)

        # 4. Agent Risk Aggregator
        t_agg = time.time()
        aggregated_agent_score = agent_risk_aggregator.aggregate(
            behavioral=res_behavioral,
            context=res_context,
            rag=res_rag,
            summary=res_summary
        )
        latencies["agent_aggregation_ms"] = round((time.time() - t_agg) * 1000.0, 2)

        # 5. Open-Source Final Decision Evaluator (Qwen/Phi reasoning format)
        t_eval = time.time()
        evaluator_output = llm_evaluator.evaluate(
            tx=tx_data,
            initial_risk=initial_risk,
            behavioral=res_behavioral,
            context=res_context,
            rag=res_rag,
            summary=res_summary,
            guardrail_result=guardrail_result
        )
        latencies["evaluator_ms"] = round((time.time() - t_eval) * 1000.0, 2)

        total_ms = (time.time() - t0) * 1000.0
        latencies["total_multi_agent_ms"] = round(total_ms, 2)

        return InvestigationState(
            transaction_id=str(tx_data.get("id", "")),
            transaction=tx_data,
            initial_risk=initial_risk,
            behavioral_result=res_behavioral,
            context_result=res_context,
            rag_result=res_rag,
            summary_result=res_summary,
            aggregated_agent_score=aggregated_agent_score,
            guardrail_result=guardrail_result,
            evaluator_result=evaluator_output.model_dump(),
            errors=[],
            latency_breakdown_ms=latencies
        )

orchestrator = MultiAgentOrchestrator()
