import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/layout";
import { Login } from "./pages/Login";
import { RequireAuth } from "./lib/auth/RequireAuth";
import { CommandCenter } from "./pages/CommandCenter";
import { LiveMap } from "./pages/LiveMap";
import { RoadIssues } from "./pages/RoadIssues";
import { IssueIntelligence } from "./pages/IssueIntelligence";
import { Traffic } from "./pages/Traffic";
import { Safety } from "./pages/Safety";
import { Infrastructure } from "./pages/Infrastructure";
import { Fleet } from "./pages/Fleet";
import { BusDetail } from "./pages/BusDetail";
import { RoutesList } from "./pages/Routes";
import { RouteDetail } from "./pages/RouteDetail";
import { Analytics } from "./pages/Analytics";
import { PriorityQueue } from "./pages/PriorityQueue";
import { Cameras } from "./pages/Cameras";
import { LiveAI } from "./pages/LiveAI";
import { Architecture } from "./pages/Architecture";
import { NotFound } from "./pages/NotFound";

// Route table — see also src/lib/nav.ts for the top-nav entries that link
// into these. Secondary/detail routes (issue, bus, route, cameras,
// priority-queue, live-ai, architecture) are reached from links on the
// primary pages rather than the nav bar itself.
function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="live-map" element={<LiveMap />} />
          <Route path="road-issues" element={<RoadIssues />} />
          <Route path="road-issues/:issueId" element={<IssueIntelligence />} />
          <Route path="traffic" element={<Traffic />} />
          <Route path="safety" element={<Safety />} />
          <Route path="infrastructure" element={<Infrastructure />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="fleet/:busId" element={<BusDetail />} />
          <Route path="routes" element={<RoutesList />} />
          <Route path="routes/:routeId" element={<RouteDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="priority-queue" element={<PriorityQueue />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="live-ai" element={<LiveAI />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
