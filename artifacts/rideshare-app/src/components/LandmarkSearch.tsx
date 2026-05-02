import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  CITIES,
  LANDMARKS,
  type Landmark,
} from "@/data/landmarks";

export type LandmarkField = "pickup" | "dropoff";

interface LandmarkSearchProps {
  field: LandmarkField;
  onSelect: (landmark: Landmark) => void;
  initialCity?: Landmark["city"];
  className?: string;
}

type CategoryFilter = "all" | keyof typeof CATEGORY_LABELS;
const ALL_CATEGORIES: readonly CategoryFilter[] = [
  "all",
  ...(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>),
];

export default function LandmarkSearch({
  field,
  onSelect,
  initialCity = "Damascus",
  className,
}: LandmarkSearchProps) {
  const [city, setCity] = useState<Landmark["city"]>(initialCity);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LANDMARKS.filter((lm) => {
      if (lm.city !== city) return false;
      if (category !== "all" && lm.category !== category) return false;
      if (q && !lm.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [city, category, query]);

  const fieldLabel = field === "pickup" ? "Pickup" : "Dropoff";

  return (
    <div
      className={`border-2 border-black bg-white ${className ?? ""}`}
    >
      <div className="px-3 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
        <span>Quick {fieldLabel}</span>
        <span className="text-yellow-400">{filtered.length}</span>
      </div>

      <div className="p-2 space-y-2 border-b-2 border-black">
        <div className="flex gap-1" role="tablist" aria-label="City">
          {CITIES.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={city === c}
              onClick={() => setCity(c)}
              className={`flex-1 px-2 py-1 border-2 border-black text-xs font-bold uppercase tracking-wider ${
                city === c
                  ? "bg-yellow-400 text-black"
                  : "bg-white text-black hover:bg-yellow-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap" role="tablist" aria-label="Category">
          {ALL_CATEGORIES.map((cat) => {
            const label = cat === "all" ? "All" : CATEGORY_LABELS[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(cat)}
                className={`px-2 py-1 border-2 border-black text-[11px] font-bold uppercase tracking-wider ${
                  active
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-yellow-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter ${city} landmarks…`}
          className="w-full px-2 py-1.5 border-2 border-black bg-white text-black text-xs focus:outline-none focus:bg-yellow-100"
        />
      </div>

      <ul className="max-h-64 overflow-y-auto divide-y-2 divide-black">
        {filtered.length === 0 && (
          <li className="px-3 py-3 text-xs font-medium text-black/60 text-center">
            No landmarks match.
          </li>
        )}
        {filtered.map((lm) => (
          <li key={lm.id}>
            <button
              type="button"
              onClick={() => onSelect(lm)}
              className="w-full text-left px-3 py-2 hover:bg-yellow-100 active:bg-yellow-400 flex items-center justify-between gap-3"
            >
              <span className="text-sm font-bold text-black truncate">
                {lm.name}
              </span>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-black/60 border border-black/40 px-1.5 py-0.5">
                {CATEGORY_LABELS[lm.category]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
