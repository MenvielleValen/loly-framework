import axios from "axios";

// NASA APIs
const NASA_BASE = "https://api.nasa.gov";
const NASA_API_KEY = "tjtU2iP1xcUlQce0mxwups84V7EeRZAB9Go3vcC8"; // Public demo key

// SpaceX API
const SPACEX_BASE = "https://api.spacexdata.com/v4";

export interface NASAPOD {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
}

export interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_local: string;
  flight_number: number;
  success?: boolean;
  upcoming: boolean;
  details?: string;
  links: {
    patch?: {
      small?: string;
      large?: string;
    };
    webcast?: string;
    article?: string;
    wikipedia?: string;
  };
  rocket?: string;
  launchpad?: string;
}

export interface Planet {
  name: string;
  id: string;
  description: string;
  distanceFromSun: string;
  diameter: string;
  mass: string;
  orbitalPeriod: string;
  dayLength: string;
  moons: number;
  imageUrl?: string;
}

export interface Astronaut {
  id: string;
  name: string;
  nationality: string;
  agency: string;
  bio?: string;
  imageUrl?: string;
  missions?: string[];
}

// NASA Astronomy Picture of the Day
export async function getNASAPOD(date?: string): Promise<NASAPOD> {
  try {
    const url = date
      ? `${NASA_BASE}/planetary/apod?api_key=${NASA_API_KEY}&date=${date}`
      : `${NASA_BASE}/planetary/apod?api_key=${NASA_API_KEY}`;

    const response = await axios.get<NASAPOD>(url);

    return response.data;
  } catch (error) {
    console.error("Error fetching NASA APOD:", error);
    throw error;
  }
}

// SpaceX Launches
export async function getSpaceXLaunches(limit = 10): Promise<SpaceXLaunch[]> {
  const response = await axios.post<SpaceXLaunch[]>(
    `${SPACEX_BASE}/launches/query`,
    {
      query: {},
      options: {
        limit,
        sort: { date_utc: -1 },
        populate: ["rocket", "launchpad"],
      },
    }
  );
  return response.data.docs || [];
}

export async function getSpaceXLaunch(
  id: string
): Promise<SpaceXLaunch | null> {
  try {
    const response = await axios.get<SpaceXLaunch>(
      `${SPACEX_BASE}/launches/${id}`
    );
    return response.data;
  } catch {
    return null;
  }
}

// Planets data (static with some enhancements)
export const PLANETS: Planet[] = [
  {
    id: "mercury",
    name: "Mercury",
    description:
      "The smallest planet in our solar system and closest to the Sun.",
    distanceFromSun: "57.9 million km",
    diameter: "4,879 km",
    mass: "3.3 × 10²³ kg",
    orbitalPeriod: "88 Earth days",
    dayLength: "59 Earth days",
    moons: 0,
  },
  {
    id: "venus",
    name: "Venus",
    description:
      "The hottest planet in our solar system, shrouded in thick clouds.",
    distanceFromSun: "108.2 million km",
    diameter: "12,104 km",
    mass: "4.87 × 10²⁴ kg",
    orbitalPeriod: "225 Earth days",
    dayLength: "243 Earth days",
    moons: 0,
  },
  {
    id: "earth",
    name: "Earth",
    description: "Our home planet, the only known celestial body with life.",
    distanceFromSun: "149.6 million km",
    diameter: "12,756 km",
    mass: "5.97 × 10²⁴ kg",
    orbitalPeriod: "365.25 days",
    dayLength: "24 hours",
    moons: 1,
  },
  {
    id: "mars",
    name: "Mars",
    description: "The Red Planet, a potential future home for humanity.",
    distanceFromSun: "227.9 million km",
    diameter: "6,792 km",
    mass: "6.39 × 10²³ kg",
    orbitalPeriod: "687 Earth days",
    dayLength: "24.6 hours",
    moons: 2,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    description: "The largest planet, a gas giant with a Great Red Spot.",
    distanceFromSun: "778.5 million km",
    diameter: "142,984 km",
    mass: "1.90 × 10²⁷ kg",
    orbitalPeriod: "12 Earth years",
    dayLength: "9.9 hours",
    moons: 95,
  },
  {
    id: "saturn",
    name: "Saturn",
    description: "Famous for its spectacular ring system.",
    distanceFromSun: "1.43 billion km",
    diameter: "120,536 km",
    mass: "5.68 × 10²⁶ kg",
    orbitalPeriod: "29 Earth years",
    dayLength: "10.7 hours",
    moons: 146,
  },
  {
    id: "uranus",
    name: "Uranus",
    description: "An ice giant that rotates on its side.",
    distanceFromSun: "2.87 billion km",
    diameter: "51,118 km",
    mass: "8.68 × 10²⁵ kg",
    orbitalPeriod: "84 Earth years",
    dayLength: "17.2 hours",
    moons: 27,
  },
  {
    id: "neptune",
    name: "Neptune",
    description: "The windiest planet with speeds up to 2,100 km/h.",
    distanceFromSun: "4.50 billion km",
    diameter: "49,528 km",
    mass: "1.02 × 10²⁶ kg",
    orbitalPeriod: "165 Earth years",
    dayLength: "16.1 hours",
    moons: 16,
  },
];

export function getPlanet(id: string): Planet | null {
  return PLANETS.find((p) => p.id === id) || null;
}

export function getAllPlanets(): Planet[] {
  return PLANETS;
}

// Astronauts data (simulated, could be enhanced with real API)
export const ASTRONAUTS: Astronaut[] = [
  {
    id: "neil-armstrong",
    name: "Neil Armstrong",
    nationality: "American",
    agency: "NASA",
    bio: "First person to walk on the Moon during Apollo 11.",
    missions: ["Apollo 11"],
  },
  {
    id: "yuri-gagarin",
    name: "Yuri Gagarin",
    nationality: "Soviet",
    agency: "Roscosmos",
    bio: "First human to journey into outer space.",
    missions: ["Vostok 1"],
  },
  {
    id: "valentina-tereshkova",
    name: "Valentina Tereshkova",
    nationality: "Soviet",
    agency: "Roscosmos",
    bio: "First woman to fly in space.",
    missions: ["Vostok 6"],
  },
  {
    id: "sally-ride",
    name: "Sally Ride",
    nationality: "American",
    agency: "NASA",
    bio: "First American woman in space.",
    missions: ["STS-7", "STS-41-G"],
  },
  {
    id: "buzz-aldrin",
    name: "Buzz Aldrin",
    nationality: "American",
    agency: "NASA",
    bio: "Second person to walk on the Moon.",
    missions: ["Apollo 11"],
  },
];

export function getAstronaut(id: string): Astronaut | null {
  return ASTRONAUTS.find((a) => a.id === id) || null;
}

export function getAllAstronauts(): Astronaut[] {
  return ASTRONAUTS;
}
