export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'analyst' | 'investigator' | 'auditor';
  full_name?: string;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AgentDetail {
  behavioral_score: number;
  behavioral_explanation?: string;
  behavioral_indicators?: Record<string, any>;
  context_category?: string;
  context_score: number;
  context_explanation?: string;
  rag_score: number;
  rag_citations?: Array<{
    policy?: string;
    section?: string;
    relevance_score?: number;
    excerpt?: string;
  }>;
  rag_explanation?: string;
  summary_text?: string;
  aggregated_agent_score: number;
  guardrail_status: string;
  guardrail_violations?: string[];
  llm_recommendation?: string;
  llm_risk_summary?: string;
  contradictions?: string[];
  missing_evidence?: string[];
  latency_breakdown_ms?: Record<string, number>;
}

export interface Transaction {
  id: string;
  amount: number;
  tx_type: 'TRANSFER' | 'CASH_OUT' | 'PAYMENT' | 'DEBIT' | 'CASH_IN';
  sender_account: string;
  receiver_account: string;
  step?: number;
  location?: string;
  device_id?: string;
  description?: string;
  oldbalance_org?: number;
  newbalance_orig?: number;
  oldbalance_dest?: number;
  newbalance_dest?: number;
  xgboost_prob?: number;
  isolation_forest_score?: number;
  initial_risk_score: number;
  agent_risk_score?: number;
  final_risk_score: number;
  decision: 'APPROVE' | 'STEP_UP_AUTH' | 'HUMAN_REVIEW' | 'REJECT';
  status: 'APPROVED' | 'OTP_PENDING' | 'OTP_VERIFIED' | 'IN_REVIEW' | 'REJECTED';
  escalated_to_agents: boolean;
  latency_ms: number;
  created_at: string;
  investigation?: AgentDetail;
}

export interface DashboardSummary {
  total_transactions: number;
  detected_fraud_count: number;
  fraud_detection_rate: number;
  false_positive_rate: number;
  high_risk_count: number;
  pending_review_count: number;
  average_latency_ms: number;
  p95_latency_ms: number;
}

export interface RiskTrendItem {
  timestamp: string;
  total_tx: number;
  fraud_tx: number;
  avg_risk: number;
}

export interface RiskDistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface HumanReviewCase {
  id: string;
  transaction_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priority: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_to?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  created_at: string;
  transaction?: Transaction;
}

export interface SystemHealth {
  status: string;
  environment: string;
  database: string;
  xgboost_model_loaded: boolean;
  isolation_forest_loaded: boolean;
  agents_ready: boolean;
  version: string;
}
