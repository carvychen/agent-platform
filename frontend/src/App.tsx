import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { SkillListPage } from "./pages/skills/SkillListPage";
import { SkillCreatePage } from "./pages/skills/SkillCreatePage";
import { SkillEditorPage } from "./pages/skills/SkillEditorPage";
import { SkillDetailPage } from "./pages/skills/SkillDetailPage";
import { McpListPage } from "./pages/mcps/McpListPage";
import { McpCreatePage } from "./pages/mcps/McpCreatePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/skills" replace />} />
              <Route path="/skills" element={<SkillListPage />} />
              <Route path="/skills/new" element={<SkillCreatePage />} />
              <Route path="/skills/:name/edit" element={<SkillEditorPage />} />
              <Route path="/skills/:name" element={<SkillDetailPage />} />
              <Route path="/mcps" element={<McpListPage />} />
              <Route path="/mcps/new" element={<McpCreatePage />} />
              <Route path="/prompts" element={<ComingSoonPage module="prompts" displayName="Prompt" />} />
              <Route path="/agents" element={<ComingSoonPage module="agents" displayName="Agent" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
