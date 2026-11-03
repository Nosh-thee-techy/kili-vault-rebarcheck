import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppExperience } from "@/components/onboarding/AppExperience";
import { ApiAuthSync } from "@/components/auth/ApiAuthSync";
import { RequireAuth } from "@/auth/RequireAuth";
import { RoleRedirect } from "@/auth/RoleRedirect";
import { LoginPage } from "@/pages/LoginPage";
import { PlannerShell } from "@/shells/PlannerShell";
import { DeveloperShell } from "@/shells/DeveloperShell";
import { AgencyShell } from "@/shells/AgencyShell";
import { CommunityShell } from "@/shells/CommunityShell";
import { PlannerDashboardPage } from "@/pages/roles/PlannerDashboardPage";
import { PlannerMapPage } from "@/pages/roles/PlannerMapPage";
import { PlannerCasesPage } from "@/pages/roles/PlannerCasesPage";
import { SharedCaseDetailPage } from "@/pages/roles/SharedCaseDetailPage";
import { DeveloperHomePage } from "@/pages/roles/DeveloperHomePage";
import { PreDevelopmentCheckPage } from "@/pages/roles/PreDevelopmentCheckPage";
import { DevelopmentImpactSimulatorPage } from "@/pages/roles/DevelopmentImpactSimulatorPage";
import { AgencyQueuePage } from "@/pages/roles/AgencyQueuePage";
import { CommunityHomePage } from "@/pages/roles/CommunityHomePage";
import { CommunityMapPage } from "@/pages/roles/CommunityMapPage";
import { CommunityReportPage } from "@/pages/roles/CommunityReportPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppExperience>
        <ApiAuthSync />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route index element={<RoleRedirect />} />

            <Route path="/planner" element={<PlannerShell />}>
              <Route index element={<PlannerDashboardPage />} />
              <Route path="map" element={<PlannerMapPage />} />
              <Route path="cases" element={<PlannerCasesPage />} />
              <Route
                path="cases/:id"
                element={<SharedCaseDetailPage backTo="/planner/cases" />}
              />
            </Route>

            <Route path="/developer" element={<DeveloperShell />}>
              <Route index element={<DeveloperHomePage />} />
              <Route path="check" element={<PreDevelopmentCheckPage />} />
              <Route
                path="simulator"
                element={<DevelopmentImpactSimulatorPage />}
              />
              <Route
                path="cases/:id"
                element={<SharedCaseDetailPage backTo="/developer" />}
              />
            </Route>

            <Route path="/agency" element={<AgencyShell />}>
              <Route index element={<AgencyQueuePage />} />
              <Route
                path="cases/:id"
                element={<SharedCaseDetailPage backTo="/agency" />}
              />
            </Route>

            <Route path="/community" element={<CommunityShell />}>
              <Route index element={<CommunityHomePage />} />
              <Route path="report" element={<CommunityReportPage />} />
              <Route path="map" element={<CommunityMapPage />} />
              <Route
                path="cases/:id"
                element={<SharedCaseDetailPage backTo="/community" />}
              />
              <Route
                path="observe"
                element={<Navigate to="/community/report" replace />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppExperience>
    </BrowserRouter>
  );
}
