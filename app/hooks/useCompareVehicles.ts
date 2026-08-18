"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SafeListing } from "../types";

const MAX_COMPARE = 3;

export interface CompareVehicle {
  id: string;
  title: string;
  imageSrc: string;
  price: number;
}

interface CompareState {
  vehicles: CompareVehicle[];
  toggle: (listing: SafeListing) => "added" | "removed" | "full";
  remove: (id: string) => void;
  clear: () => void;
}

const useCompareStore = create<CompareState>()(persist(
  (set, get) => ({
    vehicles: [],
    toggle: (listing) => {
      const current = get().vehicles;
      if (current.some((vehicle) => vehicle.id === listing.id)) {
        set({ vehicles: current.filter((vehicle) => vehicle.id !== listing.id) });
        return "removed";
      }
      if (current.length >= MAX_COMPARE) return "full";
      set({ vehicles: [...current, {
        id: listing.id,
        title: listing.title,
        imageSrc: listing.imageSrcs?.[0] || "/images/placeholder.png",
        price: listing.price,
      }] });
      return "added";
    },
    remove: (id) => set((state) => ({ vehicles: state.vehicles.filter((vehicle) => vehicle.id !== id) })),
    clear: () => set({ vehicles: [] }),
  }),
  {
    name: "redrive_compare_vehicles",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ vehicles: state.vehicles }),
  },
));

const useCompareVehicles = () => {
  const vehicles = useCompareStore((state) => state.vehicles);
  const toggle = useCompareStore((state) => state.toggle);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const includes = useCallback((id: string) => vehicles.some((vehicle) => vehicle.id === id), [vehicles]);

  return { vehicles, toggle, remove, clear, includes, max: MAX_COMPARE };
};

export default useCompareVehicles;
