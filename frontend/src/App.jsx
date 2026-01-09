import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getBinIcon } from './binIcon';

function FitBounds({ bins }) {
  const map = useMap();

  useEffect(() => {
    if (bins.length > 0) {
      const bounds = bins.map(bin => [bin.latitude, bin.longitude]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bins, map]);

  return null;
}

function App() {
  const [bins, setBins] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8080/api/bins')
      .then(res => res.json())
      .then(data => setBins(data))
      .catch(err => console.error('Error fetching bins:', err));
  }, []);

  return (
    <MapContainer
      center={[6.9271, 79.8612]} // Colombo
      zoom={13}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds bins={bins} />
      {bins.map(bin => (
        <Marker
          key={bin.id}
          position={[bin.latitude, bin.longitude]}
          icon={getBinIcon(bin.fillLevel)}
        >
          <Popup>
            Bin ID: {bin.id} <br />
            Fill Level: {bin.fillLevel}%
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default App;
