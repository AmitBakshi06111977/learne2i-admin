import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getToken, getAdminUser } from "./lib/api";
import LoginPage from "./pages/auth/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/dashboard/DashboardPage";
import UsersListPage from "./pages/users/UsersListPage";
import UserProfilePage from "./pages/users/UserProfilePage";
import QuestionsListPage from "./pages/questions/QuestionsListPage";
import QuestionEditorPage from "./pages/questions/QuestionEditorPage";
import QuestionsExportPage from "./pages/questions/QuestionsExportPage";
import QuestionsImportPage from "./pages/questions/QuestionsImportPage";
import LlmConfigPage from "./pages/ai/LlmConfigPage";
import AiPromptsPage from "./pages/ai/AiPromptsPage";
import AiControlsPage from "./pages/ai/AiControlsPage";
import CommercePage from "./pages/commerce/CommercePage";
import PaymentGatewaysPage from "./pages/commerce/PaymentGatewaysPage";
import GuessPaperMarketingPage from "./pages/commerce/GuessPaperMarketingPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import AuditLogPage from "./pages/audit/AuditLogPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = getToken();
  if (!token) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  // Re-render on auth changes (token cleared in another tab/window)
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Warm: confirm the auth wiring is in place (silent — used for boot diagnostics)
  if (typeof window !== "undefined") {
    (window as any).__learne2i_admin__ = { getToken, getAdminUser };
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersListPage />} />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/questions" element={<QuestionsListPage />} />
        <Route path="/questions/:questionId" element={<QuestionEditorPage />} />
        <Route path="/questions/export" element={<QuestionsExportPage />} />
        <Route path="/questions/import" element={<QuestionsImportPage />} />
        <Route path="/llm-config" element={<LlmConfigPage />} />
        <Route path="/ai/prompts" element={<AiPromptsPage />} />
        <Route path="/ai/controls" element={<AiControlsPage />} />
        <Route path="/commerce" element={<CommercePage />} />
        <Route path="/commerce/payment-gateways" element={<PaymentGatewaysPage />} />
        <Route path="/commerce/guess-paper-marketing" element={<GuessPaperMarketingPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

// admin webhook test 20260729-214849

// admin webhook test 215711
