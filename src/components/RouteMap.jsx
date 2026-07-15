import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Hack pour corriger les icônes Leaflet invisibles sur Vite ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
// -----------------------------------------------------------------

// Sous-composant pour recentrer la carte automatiquement selon les étapes
function MapUpdater({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] }); // Ajuste le zoom pour tout voir
    }
  }, [coordinates, map]);
  return null;
}

export default function RouteMap({ steps }) {
  // On ne garde que les étapes qui ont réussi à obtenir des coordonnées
  const stepsWithCoords = steps.filter(s => s.lat && s.lng);
  
  // On crée un tableau [latitude, longitude] pour tracer le trait entre les villes
  const coordinates = stepsWithCoords.map(s => [s.lat, s.lng]);

  // Si pas d'étapes, on centre vaguement sur l'Asie du Sud-Est
  const defaultCenter = [15.0, 105.0]; 

 return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 h-[400px] lg:h-[650px] sticky top-8 z-0">
      <MapContainer
        center={defaultCenter} 
        zoom={4} 
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {stepsWithCoords.map((step, index) => (
          <Marker key={step.id} position={[step.lat, step.lng]}>
            <Popup>
              <strong>{step.city}</strong><br/>
              Étape {index + 1}
            </Popup>
          </Marker>
        ))}

        {coordinates.length > 1 && (
          <Polyline 
            positions={coordinates} 
            color="#3b82f6" // Un joli bleu Tailwind
            weight={3}
            dashArray="10, 10" // Ligne pointillée style "carte au trésor"
          />
        )}

        <MapUpdater coordinates={coordinates} />
      </MapContainer>
    </div>
  );
}