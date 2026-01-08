import { useDataStore } from "../zustand/data";
import { Buffer } from "buffer";
import { BleError } from "react-native-ble-plx";

export function useBLEPublisher() {
  const state = useDataStore();

  const send = (k: string, data: string) => {
    if (state.writeChar) {
      try {
        const value = data;
        if (value === undefined) {
          console.warn(`[BLE] No value for key: ${k}`);
          return;
        }
        state.writeChar[k]
          ?.writeWithResponse(value.toString())
          .then(() => {
            // Successfully written
          })
          .catch((error: BleError) => {
            console.error("[BLE] Write error:", error);
          });
        console.log("[BLE] Sent JSON:", JSON.stringify({ [k]: value }));
      } catch (err) {
        console.error("[BLE] Send error:", err);
      }
    }
  };

  return send;
}
