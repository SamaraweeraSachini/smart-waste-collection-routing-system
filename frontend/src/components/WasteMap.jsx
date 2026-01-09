import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import axios from "axios";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const WasteMap = () => {
  const [bins, setBins] = useState([]);

  useEffect(() => {
    const fetchBins = async () => {
      try {
        const res = await axios.get("http://localhost:8080/api/bins");
        setBins(res.data);
      } catch (err) {
        console.error("Error fetching bins:", err);
      }
    };

    fetchBins();
  }, []);

  // Helper to choose color based on fill level
  const getMarkerColor = (fillLevel) => {
    if (fillLevel < 50) return "green";
    if (fillLevel < 80) return "orange";
    return "red";
  };

  return (
    <MapContainer
      center={[6.9271, 79.8612]}
      zoom={13}
      style={{ height: "80vh", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {bins.map((bin) => (
        <Marker
          key={bin.id}
          position={[bin.latitude, bin.longitude]}
          icon={new L.Icon({
            iconUrl: `https://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=trash|${getMarkerColor(
              bin.fillLevel
            )}`,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -40],
          })}
        >
          <Popup>
            <b>Bin ID:</b> {bin.id} <br />
            <b>Fill Level:</b> {bin.fillLevel}%
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default WasteMap;
