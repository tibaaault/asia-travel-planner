export const geocodePlace = async (query) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmedQuery)}`,
  );
  const data = await response.json();

  if (!data || data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
};
