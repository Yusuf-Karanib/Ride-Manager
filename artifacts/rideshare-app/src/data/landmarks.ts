export type LandmarkCategory =
  | "square"
  | "hospital"
  | "market"
  | "transport"
  | "university"
  | "landmark";

export interface Landmark {
  id: string;
  name: string;
  city: "Damascus" | "Aleppo";
  category: LandmarkCategory;
  lat?: number;
  lng?: number;
}

export const LANDMARKS: readonly Landmark[] = [
  // Damascus — squares
  { id: "dam-umayyad-sq",  name: "Umayyad Square",            city: "Damascus", category: "square",     lat: 33.5151, lng: 36.2769 },
  { id: "dam-marjeh-sq",   name: "Marjeh Square",             city: "Damascus", category: "square",     lat: 33.5135, lng: 36.3004 },
  { id: "dam-abbasiyyin",  name: "Abbasiyyin Square",         city: "Damascus", category: "square",     lat: 33.5226, lng: 36.3263 },
  { id: "dam-yousef-sq",   name: "Yousef al-Azmeh Square",    city: "Damascus", category: "square",     lat: 33.5140, lng: 36.2915 },
  { id: "dam-sabaa-bahrat",name: "Sabaa Bahrat Square",       city: "Damascus", category: "square",     lat: 33.5202, lng: 36.2934 },

  // Damascus — markets & old city
  { id: "dam-hamidiyeh",   name: "Al-Hamidiyeh Souq",         city: "Damascus", category: "market",     lat: 33.5117, lng: 36.3068 },
  { id: "dam-bzouriyeh",   name: "Al-Bzouriyeh Souq",         city: "Damascus", category: "market",     lat: 33.5113, lng: 36.3091 },
  { id: "dam-old-city",    name: "Old City Gate (Bab Touma)", city: "Damascus", category: "landmark",   lat: 33.5126, lng: 36.3148 },
  { id: "dam-umayyad-msq", name: "Umayyad Mosque",            city: "Damascus", category: "landmark",   lat: 33.5117, lng: 36.3065 },

  // Damascus — hospitals & transport & uni
  { id: "dam-mouwasat",    name: "Al-Mouwasat Hospital",      city: "Damascus", category: "hospital",   lat: 33.5085, lng: 36.2818 },
  { id: "dam-shami-hosp",  name: "Al-Shami Hospital",         city: "Damascus", category: "hospital",   lat: 33.5161, lng: 36.2691 },
  { id: "dam-italian-hosp",name: "Italian Hospital",          city: "Damascus", category: "hospital",   lat: 33.5158, lng: 36.2972 },
  { id: "dam-hijaz-stn",   name: "Hijaz Railway Station",     city: "Damascus", category: "transport",  lat: 33.5109, lng: 36.2950 },
  { id: "dam-baramkeh-bus",name: "Baramkeh Bus Station",      city: "Damascus", category: "transport",  lat: 33.5079, lng: 36.2864 },
  { id: "dam-uni",         name: "Damascus University",       city: "Damascus", category: "university", lat: 33.5099, lng: 36.2755 },

  // Aleppo — squares
  { id: "alp-saadallah",   name: "Saadallah al-Jabri Square", city: "Aleppo",   category: "square",     lat: 36.2027, lng: 37.1551 },
  { id: "alp-bab-faraj",   name: "Bab al-Faraj Square",       city: "Aleppo",   category: "square",     lat: 36.1991, lng: 37.1546 },

  // Aleppo — markets & landmarks
  { id: "alp-souq-mdina",  name: "Al-Madina Souq",            city: "Aleppo",   category: "market",     lat: 36.1992, lng: 37.1577 },
  { id: "alp-citadel",     name: "Aleppo Citadel",            city: "Aleppo",   category: "landmark",   lat: 36.1990, lng: 37.1626 },
  { id: "alp-grand-msq",   name: "Great Mosque of Aleppo",    city: "Aleppo",   category: "landmark",   lat: 36.1994, lng: 37.1574 },

  // Aleppo — hospitals & transport & uni
  { id: "alp-univ-hosp",   name: "University Hospital",       city: "Aleppo",   category: "hospital",   lat: 36.2225, lng: 37.1502 },
  { id: "alp-razi-hosp",   name: "Al-Razi Hospital",          city: "Aleppo",   category: "hospital",   lat: 36.2030, lng: 37.1380 },
  { id: "alp-intl-airport",name: "Aleppo International Airport", city: "Aleppo",category: "transport", lat: 36.1807, lng: 37.2244 },
  { id: "alp-baghdad-stn", name: "Baghdad Railway Station",   city: "Aleppo",   category: "transport",  lat: 36.2068, lng: 37.1518 },
  { id: "alp-uni",         name: "University of Aleppo",      city: "Aleppo",   category: "university", lat: 36.2225, lng: 37.1505 },
] as const;

export const CATEGORY_LABELS: Record<LandmarkCategory, string> = {
  square: "Square",
  hospital: "Hospital",
  market: "Market",
  transport: "Transport",
  university: "University",
  landmark: "Landmark",
};

export const CITIES: ReadonlyArray<Landmark["city"]> = ["Damascus", "Aleppo"];
