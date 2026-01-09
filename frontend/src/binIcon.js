import L from 'leaflet';
import greenBin from './assets/green-bin.png';
import yellowBin from './assets/yellow-bin.png';
import redBin from './assets/red-bin.png';

export function getBinIcon(fillLevel) {
  let iconUrl = greenBin;

  if (fillLevel >= 80) {
    iconUrl = redBin;
  } else if (fillLevel >= 50) {
    iconUrl = yellowBin;
  }

  return L.icon({
    iconUrl,
    iconSize: [35, 45],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}
