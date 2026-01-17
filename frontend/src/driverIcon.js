import L from 'leaflet';
import truckIcon from './assets/truck.png';

/**
 * Creates a driver icon with a status badge:
 * - Green dot if available
 * - Red dot if unavailable
 */
export function getDriverIcon(isAvailable) {
  const badgeColor = isAvailable ? 'green' : 'red';

  const badge = `<span style="
        position:absolute;
        top:2px;
        right:2px;
        width:10px;
        height:10px;
        background:${badgeColor};
        border-radius:50%;
        border:2px solid white;
      "></span>`;

  return L.divIcon({
    html: `
      <div style="position:relative; width:40px; height:40px;">
        <img
          src="${truckIcon}"
          style="width:40px; height:40px;"
        />
        ${badge}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: '' // prevent default leaflet styles
  });
}
