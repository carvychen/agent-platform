import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { SkillListPage } from "./pages/skills/SkillListPage";
import { SkillCreatePage } from "./pages/skills/SkillCreatePage";
import { SkillEditorPage } from "./pages/skills/SkillEditorPage";
import { SkillDetailPage } from "./pages/skills/SkillDetailPage";

const queryClient = new QueryClient();

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
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
