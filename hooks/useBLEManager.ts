import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PermissionsAndroid, Platform, Alert } from "react-native";
import * as ExpoDevice from "expo-device";
import { Device } from "react-native-ble-plx";
import { BLEServiceFactory } from "../utils/ble";
import { useDeviceStore } from "../zustand";

export function useBLEManager() {
  const { devices, addDevice, connectedDevice, setConnectedDevice } =
    useDeviceStore();
  const [scanning, setScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState({
    id: "",
    connecting: false,
    connected: false,
    error: "",
  });
  const bleService = BLEServiceFactory.createService("ESP32C3");

  // Version-aware permissions
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const scanGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: "Bluetooth Scan Permission",
            message: "Bluetooth Low Energy requires Scan",
            buttonPositive: "OK",
          }
        );
        const connectGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: "Bluetooth Connect Permission",
            message: "Bluetooth Low Energy requires Connect",
            buttonPositive: "OK",
          }
        );
        // Optionally request location for compatibility
        const locationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return (
          scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
          connectGranted === PermissionsAndroid.RESULTS.GRANTED &&
          locationGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true;
  }, []);

  useEffect(() => {
    (async () => {
      const permissionsGranted = await requestPermissions();
      if (!permissionsGranted) {
        Alert.alert(
          "Permissions required",
          "Please enable Bluetooth permissions."
        );
        return;
      }
      const handleDeviceFound = (device: Device) => {
        if (!devices.has(device.id)) {
          addDevice(device);
        }
      };
      bleService.on("deviceFound", handleDeviceFound);
      setScanning(true);
      bleService.startScan();
      const interval = setInterval(() => {
        bleService.startScan();
      }, 10000);
      return () => {
        bleService.stopScan();
        bleService.off("deviceFound", handleDeviceFound);
        clearInterval(interval);
      };
    })();
  }, [requestPermissions, devices, addDevice, bleService]);

  const connect = useCallback(
    async (device: Device, onSuccess?: () => void) => {
      setIsConnecting({
        id: device.id,
        connecting: true,
        connected: false,
        error: "",
      });
      try {
        const result = await bleService.connectToDevice(device.id);
        await result.discoverAllServicesAndCharacteristics();
        bleService.stopScan();
        setIsConnecting({
          id: device.id,
          connecting: false,
          connected: true,
          error: "",
        });
        setConnectedDevice(device);
        if (onSuccess) onSuccess();
      } catch (e) {
        setIsConnecting({
          id: device.id,
          connecting: false,
          connected: false,
          error: "Connection failed",
        });
        setConnectedDevice(null);
        Alert.alert("Connection failed", "Could not connect to device.");
        setTimeout(() => {
          setIsConnecting({
            id: device.id,
            connecting: false,
            connected: false,
            error: "",
          });
        }, 3000);
      }
    },
    [bleService, setConnectedDevice]
  );

  const deviceList = useMemo(() => Array.from(devices.values()), [devices]);

  const scan = useCallback(() => {
    (async () => {
      const permissionsGranted = await requestPermissions();
      if (!permissionsGranted) {
        Alert.alert(
          "Permissions required",
          "Please enable Bluetooth permissions."
        );
        return;
      }
      setScanning(true);
      bleService.startScan();
    })();
  }, [bleService, requestPermissions]);

  useEffect(() => {
    if (!scanning) {
      bleService.stopScan();
    }
  }, [scanning, bleService]);

  return {
    scanning,
    setScanning,
    isConnecting,
    connect,
    deviceList,
    connectedDevice,
    requestPermissions,
  };
}
