import { create } from "zustand";

type DataStorage = {
  throttle: number;
  steering: number;
  PRND: "R" | "D";
  forklift: number;
  setForklift: (value: number, cb?: () => void) => void;
  setPRND: (value: "R" | "D", cb?: () => void) => void;
  setThrottle: (value: number, cb?: () => void) => void;
  setSteering: (value: number, cb?: () => void) => void;
};

export const useDataStore = create<DataStorage>()((set) => ({
  throttle: 0,
  steering: 0,
  PRND: "D",
  forklift: 33,
  setForklift: (value, cb) => {
    set(({}) => ({ forklift: value }));
    cb?.();
  },
  setPRND: (value, cb) => {
    set({ PRND: value });
    cb?.();
  },
  setThrottle: (value, cb) => {
    set({ throttle: value });
    cb?.();
  },
  setSteering: (value, cb) => {
    set({ steering: value });
    cb?.();
  },
}));
