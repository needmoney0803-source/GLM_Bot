import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewDecision from './pages/NewDecision';
import Decisions from './pages/Decisions';
import Journal from './pages/Journal';
import Agents from './pages/Agents';
import Watchlist from './pages/Watchlist';
import RiskRules from './pages/RiskRules';
import Insights from './pages/Insights';
import Setup from './pages/Setup';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewDecision />} />
          <Route path="decisions" element={<Decisions />} />
          <Route path="journal" element={<Journal />} />
          <Route path="agents" element={<Agents />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="risk" element={<RiskRules />} />
          <Route path="insights" element={<Insights />} />
          <Route path="setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
