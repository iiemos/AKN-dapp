import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { ToastProvider } from "./components/Toast";
import HomePage from "./pages/HomePage";
import InvestPage from "./pages/InvestPage";
import MePage from "./pages/MePage";
import TeamPage from "./pages/TeamPage";
import { ReferralProvider, SelectionProvider } from "./state/appState";

export default function App() {
  return (
    <ToastProvider>
      <SelectionProvider>
        <ReferralProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/invest" element={<InvestPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/me" element={<MePage />} />
            </Route>
          </Routes>
        </ReferralProvider>
      </SelectionProvider>
    </ToastProvider>
  );
}
