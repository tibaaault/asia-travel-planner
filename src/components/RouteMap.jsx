import React, { useEffect } from 'react';
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

// Fonction pour recentrer la carte
function MapUpdater({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  return null;
}

// --- NOUVEAU : Analyse intelligente du texte pour trouver le bon Emoji ---
const getTransportEmoji = (text) => {
  if (!text) return '🎒'; // Emoji par défaut (sac à dos)
  const lowerText = text.toLowerCase();
  if (lowerText.includes('vol') || lowerText.includes('avion') || lowerText.includes('plane')) return '✈️';
  if (lowerText.includes('train')) return '🚂';
  if (lowerText.includes('bus') || lowerText.includes('car')) return '🚌';
  if (lowerText.includes('bateau') || lowerText.includes('ferry') || lowerText.includes('boat')) return '🚤';
  if (lowerText.includes('scooter') || lowerText.includes('moto')) return '🛵';
  if (lowerText.includes('voiture') || lowerText.includes('taxi')) return '🚕';
  return '🎒';
};

const createEmojiIcon = (emoji) => {
  return L.divIcon({
    html: `<div style="font-size: 16px; background: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid #3b82f6; margin-left: -14px; margin-top: -14px;">${emoji}</div>`,
    className: 'custom-emoji-icon',
  });
};

export default function RouteMap({ steps }) {
  const stepsWithCoords = steps.filter(s => s.lat && s.lng);
  const coordinates = stepsWithCoords.map(s => [s.lat, s.lng]);
  const defaultCenter = [15.0, 105.0]; 

  return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 h-[400px] lg:h-[650px] sticky top-8 z-0 relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={4} 
        style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 0 }}
      >
<TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {stepsWithCoords.map((step, index) => {
          const nextStep = stepsWithCoords[index + 1];
          let midpointMarker = null;

          // S'il y a une étape suivante, on calcule le milieu du trait pour y placer l'icône de transport
          if (nextStep) {
            const midLat = (step.lat + nextStep.lat) / 2;
            const midLng = (step.lng + nextStep.lng) / 2;
            // On regarde le moyen de transport indiqué pour l'étape suivante
            const transportEmoji = getTransportEmoji(nextStep.transport_info); 
            
            midpointMarker = (
              <Marker 
                key={`mid-${step.id}`} 
                position={[midLat, midLng]} 
                icon={createEmojiIcon(transportEmoji)}
              >
                <Popup>
                  <div className="text-center">
                    <span className="text-2xl">{transportEmoji}</span><br/>
                    <strong>Trajet vers {nextStep.city}</strong><br/>
                    <span className="text-gray-600 text-sm">
                      {nextStep.transport_info || "Moyen de transport à définir"}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          }

          return (
            <React.Fragment key={step.id}>
              {/* Marqueur classique pour la ville */}
              <Marker position={[step.lat, step.lng]}>
                <Popup>
                  <strong>{step.city}</strong><br/>
                  Étape {index + 1}
                </Popup>
              </Marker>
              
              {/* Le marqueur de transport au milieu du chemin */}
              {midpointMarker}
            </React.Fragment>
          );
        })}

        {/* Le trait bleu en pointillés qui relie tout */}
        {coordinates.length > 1 && (
          <Polyline 
            positions={coordinates} 
            color="#3b82f6" 
            weight={3}
            dashArray="8, 8" 
            opacity={0.7}
          />
        )}

        <MapUpdater coordinates={coordinates} />
      </MapContainer>
    </div>
  );
}