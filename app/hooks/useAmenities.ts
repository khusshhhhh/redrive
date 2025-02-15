import { useState } from "react";
import {
  IconTemperatureSnow,
  IconTemperatureSun,
  IconBrandSentry,
  IconMicrowave,
  IconFridge,
  IconGrill,
  IconToolsKitchen2,
  IconBowlSpoon,
  IconCoffee,
  IconPicnicTable,
  IconChairDirector,
  IconCampfire,
  IconSkiJumping,
  IconBike,
  IconGps,
  IconDeviceMobileCharging,
  IconWifi,
  IconDeviceTv,
  IconRadio,
  IconDeviceSpeaker,
  IconSteeringWheel,
  IconWheelchair,
  IconParking,
  IconSunElectricity,
  IconCamper,
  IconTent,
  IconBath,
  IconToiletPaper,
  IconBed,
  IconBucketDroplet,
  IconFlame,
  IconCaravan,
  IconBedFilled,
  IconPackageExport,
  IconChefHat,
  IconTruck,
  IconAnchor,
  IconShield,
  IconBasket,
  IconStairs,
  IconGasStation,
  IconRulerMeasure,
  IconCamera,
  IconCircleDotted,
  IconFishHook,
  IconLifebuoy,
  IconBriefcase,
  IconDroplet,
  IconArchive,
  IconTemperature,
  IconLock,
  IconBattery,
  IconTable,
  IconWindow,
  IconUsb,
  IconPackage,
  IconPlug,
  IconTrafficLights,
  IconArrowsMoveVertical,
} from "@tabler/icons-react"; // ✅ Import all required icons

// ✅ Define Global Icon Properties
const ICON_PROPS = {
  size: 24, // Set icon size
  stroke: 2, // Set stroke width
  color: "black",
  className: "transition-colors duration-300 group-hover:text-white", // Set default color
};

// ✅ Updated Amenities List
export const AMENITIES_LIST = [
  { id: "air_conditioner", name: "Air Conditioner", icon: IconTemperatureSnow },
  { id: "heater", name: "Heater", icon: IconTemperatureSun },
  { id: "basic_pantry", name: "Basic Pantry", icon: IconBrandSentry },
  { id: "microwave", name: "Microwave", icon: IconMicrowave },
  { id: "fridge", name: "Fridge", icon: IconFridge },
  { id: "bbq", name: "BBQ", icon: IconGrill },
  { id: "kitchen_tools", name: "Kitchen Tools", icon: IconToolsKitchen2 },
  { id: "cookery", name: "Cookery", icon: IconBowlSpoon },
  { id: "coffee_machine", name: "Coffee Machine", icon: IconCoffee },
  { id: "camping_table", name: "Camping Table", icon: IconPicnicTable },
  { id: "camping_chair", name: "Camping Chair", icon: IconChairDirector },
  { id: "wood", name: "Wood", icon: IconCampfire },
  { id: "ski_stand", name: "Ski-Stand", icon: IconSkiJumping },
  { id: "bike_rack", name: "Bike Rack", icon: IconBike },
  { id: "navigation", name: "In-Built Navigation", icon: IconGps },
  {
    id: "charging_station",
    name: "Charging Station",
    icon: IconDeviceMobileCharging,
  },
  { id: "wifi", name: "Wifi", icon: IconWifi },
  { id: "tv", name: "TV", icon: IconDeviceTv },
  { id: "radio", name: "Radio", icon: IconRadio },
  { id: "speaker", name: "Speaker", icon: IconDeviceSpeaker },
  { id: "cruise_control", name: "Cruise Control", icon: IconSteeringWheel },
  { id: "wheelchair_access", name: "Wheelchair Access", icon: IconWheelchair },
  { id: "parking_sensor", name: "Parking Sensor", icon: IconParking },
  { id: "solar_panel", name: "Solar Panel", icon: IconSunElectricity },
  { id: "ramp_access", name: "Ramp Access", icon: IconCamper },
  { id: "tent_access", name: "Tent Access", icon: IconTent },
  { id: "shower", name: "Built-in Shower", icon: IconBath },
  { id: "toilet", name: "Toilet", icon: IconToiletPaper },
  { id: "bed", name: "Bed", icon: IconBed },
  { id: "water_tank", name: "Water Tank", icon: IconBucketDroplet },
  { id: "gas_stove", name: "Gas Stove", icon: IconFlame },
  { id: "roof_rack", name: "Roof Rack", icon: IconCaravan },
  { id: "sleeping_pods", name: "Sleeping Pods", icon: IconBedFilled },
  { id: "pull_out_storage", name: "Pull-out Storage", icon: IconPackageExport },
  { id: "rear_kitchen", name: "Rear Kitchen Setup", icon: IconChefHat },
  {
    id: "heavy_duty_suspension",
    name: "Heavy Duty Suspension",
    icon: IconTruck,
  },
  { id: "cargo_tie_downs", name: "Cargo Tie-downs", icon: IconAnchor },
  { id: "bull_bar", name: "Bull Bar", icon: IconShield },
  { id: "roof_basket", name: "Roof Basket", icon: IconBasket },
  { id: "side_steps", name: "Side Steps", icon: IconStairs },
  {
    id: "extra_fuel_storage",
    name: "Extra Fuel Storage",
    icon: IconGasStation,
  },
  {
    id: "reinforced_chassis",
    name: "Reinforced Chassis",
    icon: IconRulerMeasure,
  },
  { id: "reverse_camera", name: "Reverse Camera", icon: IconCamera },
  { id: "disc_brakes", name: "Disc Brakes", icon: IconCircleDotted },
  { id: "fish_hook", name: "Fish Hook", icon: IconFishHook },
  { id: "lifebuoy", name: "Lifebuoy", icon: IconLifebuoy },
  { id: "briefcase", name: "Briefcase", icon: IconBriefcase },
  { id: "droplet", name: "Droplet", icon: IconDroplet },
  { id: "archive", name: "Archive", icon: IconArchive },
  { id: "temperature", name: "Temperature Control", icon: IconTemperature },
  { id: "lock", name: "Lock System", icon: IconLock },
  { id: "battery", name: "Battery", icon: IconBattery },
  { id: "table", name: "Table", icon: IconTable },
  { id: "window", name: "Window", icon: IconWindow },
  { id: "usb", name: "USB Ports", icon: IconUsb },
  { id: "package", name: "Package Storage", icon: IconPackage },
  { id: "plug", name: "Plug Outlet", icon: IconPlug },
  { id: "traffic_lights", name: "Traffic Lights", icon: IconTrafficLights },
  {
    id: "arrows_move_vertical",
    name: "Vertical Movement",
    icon: IconArrowsMoveVertical,
  },
];

// ✅ Hook for Managing Amenities Selection
const useAmenities = () => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return {
    selectedAmenities,
    toggleAmenity,
  };
};

export default useAmenities;
