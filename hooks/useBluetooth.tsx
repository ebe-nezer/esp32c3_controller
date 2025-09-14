import { useState, useEffect } from "react";
import { BleManager } from "react-native-ble-plx";

const bleManager = new BleManager();

function BluetoothStatus() {
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to Bluetooth state changes
    const subscription = bleManager.onStateChange((state) => {
      console.log("Bluetooth state:", state);
      switch (state) {
        case "PoweredOff":
          setIsConnected(false);
          setError(null);
          break;
        case "PoweredOn":
          setIsBluetoothEnabled(true);
          setError(null);
          break;
        case "Unauthorized":
          setError("Bluetooth permission is not granted.");
          break;
        case "Unsupported":
          setError("Bluetooth is not supported on this device.");
          break;
        case "Unknown":
          setError("Bluetooth state is unknown.");
          break;
        case "Resetting":
          setError("Bluetooth is resetting.");
          break;
        default:
          setError(null);
          break;
      }
      setIsBluetoothEnabled(state === "PoweredOn");
    }, true); // true means emit current status immediately

    // Cleanup subscription on component unmount
    return () => {
      subscription.remove();
    };
  }, []);

  return {
    isBluetoothEnabled,
    isConnecting,
    isConnected,
    error,
  };
}

export default BluetoothStatus;
