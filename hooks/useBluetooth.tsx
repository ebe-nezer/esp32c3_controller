import { useState, useEffect } from "react";
import { BleManager } from "react-native-ble-plx";

const bleManager = new BleManager();

function BluetoothStatus() {
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);

  useEffect(() => {
    // Subscribe to Bluetooth state changes
    const subscription = bleManager.onStateChange((state) => {
      console.log("Bluetooth state:", state);
      setIsBluetoothEnabled(state === "PoweredOn");
    }, true); // true means emit current status immediately

    // Cleanup subscription on component unmount
    return () => {
      subscription.remove();
    };
  }, []);

  return {
    isBluetoothEnabled,
  };
}

export default BluetoothStatus;
