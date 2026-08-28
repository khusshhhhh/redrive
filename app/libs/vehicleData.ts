/**
 * Curated make → model list for the "Car" and "Utes" hosting categories.
 * It does not try to be exhaustive — the flow always offers a free-text
 * "Other" fallback for makes and models that aren't listed here.
 */
export interface VehicleMake {
  make: string;
  models: string[];
}

export const OTHER_OPTION = "__other__";

export const VEHICLE_MAKES: VehicleMake[] = [
  {
    make: "Toyota",
    models: [
      "Corolla", "Camry", "Yaris", "Yaris Cross", "C-HR", "RAV4", "Kluger",
      "Prado", "LandCruiser", "LandCruiser 300", "Fortuner", "HiLux", "HiAce",
      "GR86", "GR Supra", "GR Yaris", "Granvia",
    ],
  },
  {
    make: "Ford",
    models: [
      "Fiesta", "Focus", "Mondeo", "Puma", "Escape", "Everest", "Territory",
      "Ranger", "Ranger Raptor", "F-150", "Mustang", "Transit", "Transit Custom",
    ],
  },
  {
    make: "Mazda",
    models: [
      "Mazda2", "Mazda3", "Mazda6", "CX-3", "CX-30", "CX-5", "CX-8", "CX-9",
      "CX-60", "CX-90", "BT-50", "MX-5",
    ],
  },
  {
    make: "Hyundai",
    models: [
      "i20", "i30", "Accent", "Elantra", "Sonata", "Venue", "Kona", "Tucson",
      "Santa Fe", "Palisade", "iLoad", "Staria", "iMax",
    ],
  },
  {
    make: "Kia",
    models: [
      "Picanto", "Rio", "Cerato", "Stinger", "Stonic", "Seltos", "Sportage",
      "Sorento", "Carnival", "EV6", "Niro",
    ],
  },
  {
    make: "Mitsubishi",
    models: [
      "Mirage", "ASX", "Eclipse Cross", "Outlander", "Pajero", "Pajero Sport",
      "Triton", "Express",
    ],
  },
  {
    make: "Nissan",
    models: [
      "Micra", "Pulsar", "Juke", "Qashqai", "X-Trail", "Pathfinder", "Patrol",
      "Navara", "370Z", "Z", "Leaf",
    ],
  },
  {
    make: "Subaru",
    models: [
      "Impreza", "WRX", "Liberty", "XV", "Crosstrek", "Forester", "Outback",
      "BRZ", "Levorg",
    ],
  },
  {
    make: "Volkswagen",
    models: [
      "Polo", "Golf", "Golf GTI", "Passat", "T-Cross", "T-Roc", "Tiguan",
      "Touareg", "Amarok", "Caddy", "Transporter", "Multivan",
    ],
  },
  {
    make: "Honda",
    models: ["Jazz", "Civic", "Accord", "HR-V", "CR-V", "ZR-V", "Odyssey"],
  },
  {
    make: "Holden",
    models: [
      "Barina", "Astra", "Cruze", "Commodore", "Calais", "Trax", "Trailblazer",
      "Captiva", "Colorado", "Ute",
    ],
  },
  {
    make: "BMW",
    models: [
      "1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "X1", "X2",
      "X3", "X4", "X5", "X6", "X7", "M2", "M3", "M4", "i4", "iX",
    ],
  },
  {
    make: "Mercedes-Benz",
    models: [
      "A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "CLA", "GLA",
      "GLB", "GLC", "GLE", "GLS", "X-Class", "V-Class", "Sprinter", "Vito",
    ],
  },
  {
    make: "Audi",
    models: [
      "A1", "A3", "A4", "A5", "A6", "A7", "Q2", "Q3", "Q5", "Q7", "Q8", "TT",
      "e-tron",
    ],
  },
  { make: "Isuzu Ute", models: ["D-MAX", "MU-X"] },
  {
    make: "MG",
    models: ["MG3", "MG4", "MG5", "ZS", "ZST", "HS", "MG6"],
  },
  {
    make: "GWM",
    models: [
      "Haval H6", "Haval Jolion", "Haval H2", "Cannon (Ute)", "Tank 300", "Ora",
    ],
  },
  {
    make: "LDV",
    models: ["G10", "T60", "D90", "Deliver 9", "Mifa"],
  },
  { make: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X"] },
  {
    make: "Suzuki",
    models: ["Swift", "Baleno", "Ignis", "Vitara", "S-Cross", "Jimny"],
  },
  {
    make: "Jeep",
    models: [
      "Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler",
      "Gladiator",
    ],
  },
  {
    make: "Land Rover",
    models: [
      "Defender", "Discovery", "Discovery Sport", "Range Rover",
      "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar",
    ],
  },
  {
    make: "Volvo",
    models: ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90"],
  },
  {
    make: "Lexus",
    models: ["IS", "ES", "LS", "UX", "NX", "RX", "GX", "LX", "RC", "LC"],
  },
  { make: "RAM", models: ["1500", "2500", "3500"] },
  {
    make: "Chevrolet",
    models: ["Silverado 1500", "Silverado 2500", "Corvette"],
  },
  {
    make: "Renault",
    models: [
      "Clio", "Megane", "Captur", "Koleos", "Arkana", "Kangoo", "Trafic",
      "Master",
    ],
  },
  {
    make: "Peugeot",
    models: ["208", "308", "2008", "3008", "5008", "Partner", "Expert", "Landtrek"],
  },
  {
    make: "Skoda",
    models: ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq"],
  },
  { make: "SsangYong", models: ["Musso", "Rexton", "Korando"] },
  { make: "Genesis", models: ["G70", "G80", "GV70", "GV80"] },
];

export const VEHICLE_MAKE_NAMES = VEHICLE_MAKES.map((entry) => entry.make);

export function modelsForMake(make: string): string[] {
  return VEHICLE_MAKES.find((entry) => entry.make === make)?.models ?? [];
}
