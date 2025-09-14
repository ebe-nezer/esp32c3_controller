import { create } from "zustand";

type DataStorage = {
  throttle: number;
  steering: number;
  PRND: "R" | "D";
  forklift: number;
  setForklift: (value: number) => void;
  setPRND: (value: "R" | "D") => void;
  setThrottle: (value: number) => void;
  setSteering: (value: number) => void;
};

export const useDataStore = create<DataStorage>()((set) => ({
  throttle: 0,
  steering: 0,
  PRND: "D",
  forklift: 0,
  setForklift: (value) => set({ forklift: value }),
  setPRND: (value) => set({ PRND: value }),
  setThrottle: (value) => set({ throttle: value }),
  setSteering: (value) => set({ steering: value }),
}));
