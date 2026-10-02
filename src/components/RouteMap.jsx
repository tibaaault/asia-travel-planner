import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Hack pour corriger les icônes Leaflet invisibles sur Vite ---
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

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

// Analyse intelligente du texte pour trouver le bon Emoji
const getTransportEmoji = (text) => {
  if (!text) return "🎒";
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes("vol") ||
    lowerText.includes("avion") ||
    lowerText.includes("plane") ||
    lowerText.includes("flight")
  )
    return "✈️";
  if (lowerText.includes("train")) return "🚂";
  if (lowerText.includes("bus") || lowerText.includes("car")) return "🚌";
  if (
    lowerText.includes("bateau") ||
    lowerText.includes("ferry") ||
    lowerText.includes("boat")
  )
    return "🚤";
  if (lowerText.includes("scooter") || lowerText.includes("moto")) return "🛵";
  if (
    lowerText.includes("voiture") ||
    lowerText.includes("taxi") ||
    lowerText.includes("grab")
  )
    return "🚕";
  return "🎒";
};

const createEmojiIcon = (emoji) => {
  return L.divIcon({
    html: `<div style="font-size: 16px; background: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid #3b82f6; margin-left: -14px; margin-top: -14px;">${emoji}</div>`,
    className: "custom-emoji-icon",
  });
};

const createActivityIcon = () => {
  return L.divIcon({
    html: `<div style="font-size: 15px; background: white; color: #059669; border-radius: 9999px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.25); border: 2px solid #10b981; margin-left: -15px; margin-top: -15px;">•</div>`,
    className: "custom-activity-icon",
  });
};

const createActivityRouteIcon = (
  emoji,
  color = "#16a34a",
  borderColor = "#22c55e",
) => {
  return L.divIcon({
    html: `<div style="font-size: 14px; background: white; color: ${color}; border-radius: 9999px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.18); border: 2px solid ${borderColor}; margin-left: -13px; margin-top: -13px;">${emoji}</div>`,
    className: "custom-activity-route-icon",
  });
};

const normalizeText = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getActivityTravelMode = (activity) => {
  const text = normalizeText(
    [activity?.title, activity?.place, activity?.notes]
      .filter(Boolean)
      .join(" "),
  );

  if (
    text.includes("randonnee") ||
    text.includes("randonnée") ||
    text.includes("marche") ||
    text.includes("hike") ||
    text.includes("walk") ||
    text.includes("trek")
  ) {
    return { profile: "foot", emoji: "🚶", label: "Trajet à pied" };
  }

  if (
    text.includes("scooter") ||
    text.includes("moto") ||
    text.includes("vespa")
  ) {
    return { profile: "driving", emoji: "🛵", label: "Trajet en scooter" };
  }

  return { profile: "driving", emoji: "🚗", label: "Trajet en voiture" };
};

export default function RouteMap({ steps }) {
  const stepsWithCoords = steps.filter((s) => s.lat && s.lng);
  const cityCoordinates = stepsWithCoords.map((s) => [s.lat, s.lng]);
  const activityMarkers = stepsWithCoords.flatMap((step) =>
    (step.activities || [])
      .filter((activity) => activity?.lat && activity?.lng)
      .map((activity) => ({
        id: `${step.id}-${activity.id || activity.title}`,
        step,
        activity,
      })),
  );
  const activityCoordinates = activityMarkers.map((marker) => [
    marker.activity.lat,
    marker.activity.lng,
  ]);
  const defaultCenter = [15.0, 105.0];

  // État pour stocker les tracés OSRM
  const [routes, setRoutes] = useState({});
  const [activityRoutes, setActivityRoutes] = useState({});

  // On crée une chaîne de dépendance pour ne relancer le fetch que si les données de transport/étapes changent
  const stepsDependency = stepsWithCoords
    .map(
      (s) =>
        `${s.id}-${s.lat}-${s.lng}-${s.transport_info}-${JSON.stringify(s.activities || [])}`,
    )
    .join("|");

  useEffect(() => {
    const fetchRoutes = async () => {
      const newRoutes = {};

      for (let i = 0; i < stepsWithCoords.length - 1; i++) {
        const current = stepsWithCoords[i];
        const next = stepsWithCoords[i + 1];
        const segmentKey = `${current.id}-${next.id}`;

        const transportEmoji = getTransportEmoji(next.transport_info);
        const isFlight = transportEmoji === "✈️"; // Si c'est un avion, ligne droite

        // Ligne droite classique pour les vols
        if (isFlight) {
          newRoutes[segmentKey] = {
            path: [
              [current.lat, current.lng],
              [next.lat, next.lng],
            ],
            midpoint: [
              (current.lat + next.lat) / 2,
              (current.lng + next.lng) / 2,
            ],
            emoji: transportEmoji,
            info: next.transport_info,
            isFlight: true,
          };
          continue;
        }

        // Requête OSRM pour les autres transports (Attention : OSRM prend "longitude,latitude")
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${current.lng},${current.lat};${next.lng},${next.lat}?geometries=geojson`,
          );
          const data = await res.json();

          if (data.routes && data.routes.length > 0) {
            // OSRM renvoie un GeoJSON avec des [lng, lat], on doit les inverser pour Leaflet [lat, lng]
            const coords = data.routes[0].geometry.coordinates.map((c) => [
              c[1],
              c[0],
            ]);
            newRoutes[segmentKey] = {
              path: coords,
              midpoint: coords[Math.floor(coords.length / 2)], // On prend le point géographique exact au milieu du trajet
              emoji: transportEmoji,
              info: next.transport_info,
              isFlight: false,
            };
          } else {
            throw new Error("Aucune route terrestre trouvée");
          }
        } catch (err) {
          console.error(
            `Impossible de tracer la route OSRM entre ${current.city} et ${next.city}, repli sur ligne droite.`,
            err,
          );
          // Fallback (repli) sur une ligne droite si OSRM échoue (ex: traversée d'une mer sans ferry)
          newRoutes[segmentKey] = {
            path: [
              [current.lat, current.lng],
              [next.lat, next.lng],
            ],
            midpoint: [
              (current.lat + next.lat) / 2,
              (current.lng + next.lng) / 2,
            ],
            emoji: transportEmoji,
            info: next.transport_info,
            isFlight: true,
          };
        }
      }
      setRoutes(newRoutes);
    };

    const fetchActivityRoutes = async () => {
      const newActivityRoutes = {};

      for (const step of stepsWithCoords) {
        for (const activity of step.activities || []) {
          if (!activity?.lat || !activity?.lng) continue;

          const routeKey = `${step.id}-${activity.id || activity.title}`;
          const travelMode = getActivityTravelMode(activity);

          try {
            const res = await fetch(
              `https://router.project-osrm.org/route/v1/${travelMode.profile}/${step.lng},${step.lat};${activity.lng},${activity.lat}?geometries=geojson`,
            );
            const data = await res.json();

            if (data.routes && data.routes.length > 0) {
              const coords = data.routes[0].geometry.coordinates.map((c) => [
                c[1],
                c[0],
              ]);
              newActivityRoutes[routeKey] = {
                path: coords,
                midpoint: coords[Math.floor(coords.length / 2)],
                info: activity.place || activity.title,
                emoji: travelMode.emoji,
                label: travelMode.label,
                isActivityRoute: true,
              };
            } else {
              throw new Error("Aucune route activité trouvée");
            }
          } catch (err) {
            console.error(
              `Impossible de tracer le trajet entre ${step.city} et ${activity.title}, repli sur ligne droite.`,
              err,
            );
            newActivityRoutes[routeKey] = {
              path: [
                [step.lat, step.lng],
                [activity.lat, activity.lng],
              ],
              midpoint: [
                (step.lat + activity.lat) / 2,
                (step.lng + activity.lng) / 2,
              ],
              info: activity.place || activity.title,
              emoji: travelMode.emoji,
              label: travelMode.label,
              isActivityRoute: true,
            };
          }
        }
      }

      setActivityRoutes(newActivityRoutes);
    };

    if (stepsWithCoords.length > 1) {
      fetchRoutes();
    } else {
      setRoutes({});
    }

    if (activityMarkers.length > 0) {
      fetchActivityRoutes();
    } else {
      setActivityRoutes({});
    }
  }, [stepsDependency, activityMarkers.length]);

  return (
    // J'ai retiré les classes de bordures et d'ombres ici, car Timeline.jsx les gère déjà pour le conteneur parent
    <MapContainer
      center={defaultCenter}
      zoom={4}
      className="h-full w-full rounded-3xl z-0">
      {/* Tuiles OpenStreetMap : CARTO exige désormais une clé API et renvoie
          des tuiles "API KEY REQUIRED" sans elle. */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* 1. Affichage des marqueurs des villes */}
      {stepsWithCoords.map((step, index) => (
        <Marker key={`city-${step.id}`} position={[step.lat, step.lng]}>
          <Popup>
            <strong>{step.city}</strong>
            <br />
            Étape {index + 1}
          </Popup>
        </Marker>
      ))}

      {activityMarkers.map((marker) => (
        <Marker
          key={`activity-${marker.id}`}
          position={[marker.activity.lat, marker.activity.lng]}
          icon={createActivityIcon()}>
          <Popup>
            <div className="text-center">
              <strong>{marker.activity.title || "Activité"}</strong>
              <br />
              <span className="text-gray-600 text-sm mt-1 block">
                {marker.activity.place || marker.step.city}
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                {marker.step.city}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}

      {Object.entries(activityRoutes).map(([key, routeData]) => (
        <React.Fragment key={`activity-route-${key}`}>
          <Polyline
            positions={routeData.path}
            color="#10b981"
            weight={3}
            dashArray="6, 8"
            opacity={0.75}
          />
          <Marker
            position={routeData.midpoint}
            icon={
              routeData.emoji === "🛵"
                ? createActivityRouteIcon("🛵", "#7c3aed", "#8b5cf6")
                : routeData.emoji === "🚶"
                  ? createActivityRouteIcon("🚶", "#16a34a", "#22c55e")
                  : createActivityRouteIcon("🚗", "#2563eb", "#3b82f6")
            }>
            <Popup>
              <div className="text-center">
                <span className="text-lg">{routeData.emoji || "🚶"}</span>
                <br />
                <span className="text-gray-600 text-sm mt-1 block">
                  {routeData.label || "Trajet vers l'activité"}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  {routeData.info || "Lieu de l'activité"}
                </span>
              </div>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}

      {/* 2. Affichage des tracés et des icônes de transport */}
      {Object.entries(routes).map(([key, routeData]) => (
        <React.Fragment key={`route-${key}`}>
          {/* Le tracé (Pointillés pour vols/fallbacks, continu pour routes réelles) */}
          <Polyline
            positions={routeData.path}
            color="#3b82f6"
            weight={routeData.isFlight ? 3 : 4}
            dashArray={routeData.isFlight ? "8, 8" : "none"}
            opacity={0.8}
          />

          {/* Le marqueur de transport au milieu de ce tracé précis */}
          <Marker
            position={routeData.midpoint}
            icon={createEmojiIcon(routeData.emoji)}>
            <Popup>
              <div className="text-center">
                <span className="text-2xl">{routeData.emoji}</span>
                <br />
                <span className="text-gray-600 text-sm mt-1 block">
                  {routeData.info || "Moyen de transport à définir"}
                </span>
              </div>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}

      {/* Recadrage automatique sur l'ensemble des villes */}
      <MapUpdater coordinates={[...cityCoordinates, ...activityCoordinates]} />
    </MapContainer>
  );
}
