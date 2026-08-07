import { useState } from "react";
import { Plus, MapPin, Network, CalendarDays } from "lucide-react";
import { formatDaysNights } from "../utils/duration";
import { geocodePlace } from "../utils/geocoding";

export default function AddStepForm({ onAddStep, parentSteps = [] }) {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [duration, setDuration] = useState("");
  const [parentId, setParentId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city || !country || !duration) return;

    let lat = null;
    let lng = null;
    try {
      const location = await geocodePlace(`${city}, ${country}`);
      if (location) {
        lat = location.lat;
        lng = location.lng;
      }
    } catch (err) {}

    const newStep = {
      city,
      country,
      duration: parseInt(duration, 10),
      lat,
      lng,
      parent_id: parentId === "" ? null : parentId,
    };

    onAddStep(newStep);
    setCity("");
    setCountry("");
    setDuration("");
    setParentId("");
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-blue-400";

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <Plus size={16} strokeWidth={3} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Ajouter une étape
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-4 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <MapPin size={14} className="text-slate-400" />
          </div>
          <input
            type="text"
            name="step-city"
            placeholder="Ville (ex. Malang)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`${inputClass} pl-9`}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="md:col-span-3">
          <input
            type="text"
            name="step-country"
            placeholder="Pays (ex. Indonésie)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="md:col-span-2 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <CalendarDays size={14} className="text-slate-400" />
          </div>
          <input
            type="number"
            name="step-duration"
            placeholder="Jours"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={`${inputClass} pl-9`}
            autoComplete="off"
            required
          />
        </div>

        <div className="md:col-span-3 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Network size={14} className="text-slate-400" />
          </div>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={`${inputClass} pl-9 appearance-none cursor-pointer`}
          >
            <option value="">Camp de Base</option>
            {parentSteps.map((parent) => (
              <option key={parent.id} value={parent.id}>
                ↳ Rattaché à {parent.city}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">
          {duration ? `Sera affiché comme : ${formatDaysNights(duration)}` : 'Indique la durée en jours'}
        </p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Valider
        </button>
      </div>
    </form>
  );
}