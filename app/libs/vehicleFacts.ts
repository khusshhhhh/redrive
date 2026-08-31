import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconCamera,
  IconCar,
  IconEye,
  IconGauge,
  IconParking,
  IconRadar,
  IconRoad,
  IconShieldHalfFilled,
  IconSteeringWheel,
  IconViewfinder,
  type Icon,
} from "@tabler/icons-react";

export interface Option {
  value: string;
  label: string;
}

export interface FactItem {
  id: string;
  name: string;
  icon: Icon;
}

export const TRANSMISSION_OPTIONS: Option[] = [
  { value: "AUTOMATIC", label: "Automatic" },
  { value: "MANUAL", label: "Manual" },
];

export const TYRE_CONDITION_OPTIONS: Option[] = [
  { value: "NEW", label: "New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
];

export const CHARGE_PORT_OPTIONS: Option[] = [
  { value: "TYPE_2", label: "Type 2 (AC)" },
  { value: "CCS2", label: "CCS2 (DC)" },
  { value: "CHADEMO", label: "CHAdeMO" },
  { value: "TESLA_NACS", label: "Tesla / NACS" },
];

export const HANDOVER_METHOD_OPTIONS: Option[] = [
  { value: "IN_PERSON", label: "In person" },
  { value: "LOCKBOX", label: "Lockbox" },
  { value: "SELF_CHECKIN", label: "Self check-in" },
];

export const TOLL_HANDLING_OPTIONS: Option[] = [
  { value: "TAG_INCLUDED", label: "E-tag included" },
  { value: "BILLED_BACK", label: "Billed back to guest" },
  { value: "GUEST_ARRANGES", label: "Guest arranges their own" },
];

export const DEPOSIT_HOLD_OPTIONS: Option[] = [
  { value: "PRE_AUTH", label: "Card pre-authorisation" },
  { value: "MANUAL_TRANSFER", label: "Manual bank transfer" },
];

export const SHOWER_TYPE_OPTIONS: Option[] = [
  { value: "INTERNAL", label: "Internal" },
  { value: "EXTERNAL", label: "External" },
  { value: "NONE", label: "None" },
];

export const TOILET_TYPE_OPTIONS: Option[] = [
  { value: "CASSETTE", label: "Cassette" },
  { value: "COMPOSTING", label: "Composting" },
  { value: "PORTABLE", label: "Portable" },
  { value: "NONE", label: "None" },
];

export const SAFETY_FEATURES_LIST: FactItem[] = [
  { id: "aeb", name: "Autonomous emergency braking", icon: IconAlertTriangle },
  { id: "lane_keep", name: "Lane-keep assist", icon: IconRoad },
  { id: "blind_spot", name: "Blind-spot monitor", icon: IconEye },
  { id: "adaptive_cruise", name: "Adaptive cruise control", icon: IconGauge },
  { id: "reversing_camera", name: "Reversing camera", icon: IconCamera },
  { id: "parking_sensors", name: "Front & rear parking sensors", icon: IconParking },
  { id: "camera_360", name: "360° camera", icon: IconViewfinder },
  { id: "curtain_airbags", name: "Curtain airbags", icon: IconShieldHalfFilled },
  { id: "tpms", name: "Tyre-pressure monitoring", icon: IconRadar },
  { id: "driver_attention", name: "Driver-attention alert", icon: IconSteeringWheel },
  { id: "iso_fix", name: "ISOFIX child-seat anchors", icon: IconCar },
  { id: "auto_high_beam", name: "Auto high beam", icon: IconArrowsMaximize },
];

export const LANGUAGE_OPTIONS: FactItem[] = [
  { id: "english", name: "English", icon: IconCar },
  { id: "mandarin", name: "Mandarin", icon: IconCar },
  { id: "cantonese", name: "Cantonese", icon: IconCar },
  { id: "hindi", name: "Hindi", icon: IconCar },
  { id: "punjabi", name: "Punjabi", icon: IconCar },
  { id: "arabic", name: "Arabic", icon: IconCar },
  { id: "vietnamese", name: "Vietnamese", icon: IconCar },
  { id: "italian", name: "Italian", icon: IconCar },
  { id: "greek", name: "Greek", icon: IconCar },
  { id: "spanish", name: "Spanish", icon: IconCar },
  { id: "tagalog", name: "Tagalog", icon: IconCar },
  { id: "auslan", name: "Auslan", icon: IconCar },
];

const OPTION_LABEL_LOOKUPS: Record<string, Option[]> = {
  transmission: TRANSMISSION_OPTIONS,
  tyreCondition: TYRE_CONDITION_OPTIONS,
  chargePortType: CHARGE_PORT_OPTIONS,
  handoverMethod: HANDOVER_METHOD_OPTIONS,
  tollHandling: TOLL_HANDLING_OPTIONS,
  depositHoldMethod: DEPOSIT_HOLD_OPTIONS,
  showerType: SHOWER_TYPE_OPTIONS,
  toiletType: TOILET_TYPE_OPTIONS,
};

/** Human label for a stored option value, e.g. optionLabel("transmission", "AUTOMATIC") -> "Automatic". */
export function optionLabel(field: keyof typeof OPTION_LABEL_LOOKUPS, value?: string | null): string {
  if (!value) return "";
  const match = OPTION_LABEL_LOOKUPS[field]?.find((option) => option.value === value);
  return match ? match.label : value;
}

export function factName(list: FactItem[], id: string): string {
  return list.find((item) => item.id === id)?.name ?? id;
}

export type CategorySpecGroup = "UTE" | "VAN" | "CAMPER" | null;

/** Which category-specific detail block applies to a listing category. */
export function categorySpecGroup(category?: string | null): CategorySpecGroup {
  switch (category) {
    case "Utes":
      return "UTE";
    case "Vans":
      return "VAN";
    case "Caravans":
    case "Motorhomes":
      return "CAMPER";
    default:
      return null;
  }
}
