// frontend/src/components/Layout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  const linkStyle = (path) => ({
    padding: "10px 14px",
    borderRadius: 10,
    textDecoration: "none",
    color: "white",
    background: location.pathname === path ? "#2563eb" : "rgba(255,255,255,0.12)",
    display: "inline-block",
    marginRight: 10,
    fontWeight: 600,
  });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, background: "#0b1220", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link to="/" style={linkStyle("/")}>🗺️ Dashboard</Link>
        <Link to="/analytics" style={linkStyle("/analytics")}>📊 Analytics</Link>
        <Link to="/routes" style={linkStyle("/routes")}>Routes</Link>
      </div>

      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}
