import { Characteristic } from "react-native-ble-plx";
import { create } from "zustand";

type DataStorage = {
  throttle: number;
  steering: number;
  PRND: "R" | "D";
  forklift: number;
  writeChar: {
    [k: string]: Characteristic | null;
  };
  setForklift: (value: number) => void;
  setPRND: (value: "R" | "D") => void;
  setThrottle: (value: number) => void;
  setSteering: (value: number) => void;
  setWriteChar: (e: { [k: string]: Characteristic | null } | null) => void;
  setData: (
    data: Partial<Omit<DataStorage, "setData">>,
    cb?: () => void
  ) => void;
};

export const useDataStore = create<DataStorage>()((set) => ({
  throttle: 0,
  steering: 90,
  PRND: "D",
  forklift: 0,
  writeChar: {},
  setWriteChar: (e) => set({ ...e }),
  setForklift: (value) => set({ forklift: value }),
  setPRND: (value) => set({ PRND: value }),
  setThrottle: (value) => set({ throttle: value }),
  setSteering: (value) => set({ steering: value }),
  setData(data, cb) {
    cb?.();
    set((values) => ({
      ...values,
      ...data,
    }));
  },
}));
