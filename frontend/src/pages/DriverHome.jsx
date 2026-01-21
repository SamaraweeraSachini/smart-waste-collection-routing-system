import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8080";

export default function DriverHome() {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/drivers`)
      .then((res) => res.json())
      .then((data) => setDrivers(data || []))
      .catch(console.error);
  }, []);

  const handleGo = () => {
    if (!selectedDriverId) {
      setMsg("⚠️ Please select a driver");
      return;
    }
    navigate(`/driver/${selectedDriverId}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 10 }}>🚚 Driver Portal</h2>
      <p style={{ marginTop: 0, color: "#666" }}>
        Select your driver account and view today’s assigned route.
      </p>

      <div style={{ maxWidth: 350, marginTop: 18 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Select Driver
        </label>
        <select
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
        >
          <option value="">-- Choose a Driver --</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} (Vehicle: {d.vehicleNumber})
            </option>
          ))}
        </select>

        <button
          onClick={handleGo}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px",
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✅ View My Route Today
        </button>

        {msg && (
          <div style={{ marginTop: 12, color: "#b00020", fontWeight: 600 }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
