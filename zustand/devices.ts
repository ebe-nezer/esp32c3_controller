import { Device } from "react-native-ble-plx";
import { create } from "zustand";

type DeviceStore = {
  devices: Map<string, Device>;
  addDevice: (device: Device) => void;
  removeDevice: () => void;
  clearDevices: () => void;
  connectedDevice: Device | null;
  setConnectedDevice: (device: Device | null) => void;
};

export const useDeviceStore = create<DeviceStore>()((set) => ({
  devices: new Map(),
  addDevice: (device) =>
    set((state) => {
      const newMap = new Map(state.devices);
      newMap.set(device.id, device);
      return { devices: newMap };
    }),
  removeDevice: () =>
    set((state) => {
      const newMap = new Map(state.devices);
      if (!state.connectedDevice) return state;
      newMap.delete(state.connectedDevice.id);
      return { devices: newMap };
    }),
  clearDevices: () => set({ devices: new Map() }),
  connectedDevice: null,
  setConnectedDevice: (device) => set({ connectedDevice: device }),
}));
