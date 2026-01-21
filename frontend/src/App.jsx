// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import RoutesPage from "./pages/Routes";
import RouteDetails from "./pages/RouteDetails";
import DriverHome from "./pages/DriverHome";
import DriverRoute from "./pages/DriverRoute";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/routes/:id" element={<RouteDetails />} />
          <Route path="/driver" element={<DriverHome />} />
           <Route path="driver/:driverId" element={<DriverRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
