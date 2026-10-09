import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionAnalysisPage } from './pages/TransactionAnalysisPage';
import { FraudInvestigationPage } from './pages/FraudInvestigationPage';
import { MultiAgentAnalysisPage } from './pages/MultiAgentAnalysisPage';
import { HistoricalTransactionsPage } from './pages/HistoricalTransactionsPage';
import { RiskAnalyticsPage } from './pages/RiskAnalyticsPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { HumanReviewPage } from './pages/HumanReviewPage';
import { SettingsHealthPage } from './pages/SettingsHealthPage';
import { TransactionForm } from './components/forms/TransactionForm';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400 text-xs font-mono">
        Authenticating SentinelAI Terminal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/submit"
              element={
                <div className="space-y-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-100">Live Transaction Submission</h1>
                    <p className="text-xs text-slate-400">
                      Submit financial transactions for immediate feature extraction and multi-agent risk defense
                    </p>
                  </div>
                  <TransactionForm />
                </div>
              }
            />
            <Route path="/transaction-analysis" element={<TransactionAnalysisPage />} />
            <Route path="/fraud-investigation" element={<FraudInvestigationPage />} />
            <Route path="/multi-agent" element={<MultiAgentAnalysisPage />} />
            <Route path="/history" element={<HistoricalTransactionsPage />} />
            <Route path="/risk-analytics" element={<RiskAnalyticsPage />} />
            <Route path="/model-performance" element={<ModelPerformancePage />} />
            <Route path="/human-review" element={<HumanReviewPage />} />
            <Route path="/settings" element={<SettingsHealthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
