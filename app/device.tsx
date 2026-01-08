import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableNativeFeedback,
  BackHandler,
} from "react-native";
import { BLEServiceFactory } from "../utils/ble";
import { useDataStore, useDeviceStore } from "../zustand";
import { Buffer } from "buffer";
import * as ScreenOrientation from "expo-screen-orientation";
import { router } from "expo-router";
import { Chip } from "react-native-paper";
import Icon from "react-native-vector-icons/AntDesign";
import {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Animated from "react-native-reanimated";
import RealisticSteeringWheel from "../components/ui/steering";
import Slider from "../components/ui/slider";
import Fab from "../components/ui/prnd";

import { Characteristic } from "react-native-ble-plx";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// UUIDs for BLE service and characteristics
const UUIDS = {
  SERVICE: "12345678-1234-1234-1234-123456789abc",
  THROTTLE: "aaaabbbb-1111-2222-3333-aaaaaaaaaaaa",
  STEERING: "bbbbaaaa-2222-3333-1111-bbbbbbbbbbbb",
  FORKLIFT: "ccccdddd-3333-4444-1111-cccccccccccc",
};

const enter = FadeInDown.springify(16).damping(16);
const exit = FadeOutDown.springify(16).damping(16);

export default function App() {
  // Reference for BLE characteristics
  const chars = useRef<{ [k: string]: Characteristic | null }>({});

  // Device and connection management
  const { connectedDevice, removeDevice } = useDeviceStore();
  const [isConnected, setIsConnected] = useState(true);
  const bleService = BLEServiceFactory.createService("ESP32C3");
  const monitorSub = useRef<any>(null);

  // App local state store
  const { setData, PRND } = useDataStore();

  // Effect: connect and discover BLE characteristics
  useEffect(() => {
    let disconnectSub: any = null;

    const connectAndDiscover = async () => {
      if (!connectedDevice) return console.warn("No connected device");

      try {
        const device = await bleService.connectToDevice(connectedDevice.id);
        setIsConnected(true);

        disconnectSub = device.onDisconnected(() => {
          setIsConnected(false);
          chars.current = {};
          if (monitorSub.current) {
            monitorSub.current.remove();
            monitorSub.current = null;
          }
          removeDevice();
        });

        await device.discoverAllServicesAndCharacteristics();

        const services = await device.services();
        const service = services.find(
          (s) => s.uuid.toLowerCase() === UUIDS.SERVICE
        );
        if (!service) return console.warn("Service not found");

        const characteristics = await device.characteristicsForService(
          service.uuid
        );

        console.log(
          "Discovered characteristics count:",
          characteristics.length
        );

        const charThrottle = characteristics.find(
          (c) => c.uuid && c.uuid.toLowerCase() === UUIDS.THROTTLE
        );
        const charSteering = characteristics.find(
          (c) => c.uuid && c.uuid.toLowerCase() === UUIDS.STEERING
        );
        const charForklift = characteristics.find(
          (c) => c.uuid && c.uuid.toLowerCase() === UUIDS.FORKLIFT
        );

        // Save characteristic references
        chars.current = {
          throttle: charThrottle || null,
          steering: charSteering || null,
          forklift: charForklift || null,
        };

        console.log("Discovered characteristics:", {
          throttle: charThrottle?.uuid,
          steering: charSteering?.uuid,
          forklift: charForklift?.uuid,
        });
      } catch (err) {
        setIsConnected(false);
        console.error(err);
      }
    };

    connectAndDiscover();

    return () => {
      if (disconnectSub) disconnectSub.remove();
      if (monitorSub.current) {
        monitorSub.current.remove();
        monitorSub.current = null;
      }
    };
  }, [connectedDevice, bleService, removeDevice]);

  // Handle sending data to BLE characteristic by key
  const handleSendData = (
    key: "throttle" | "steering" | "forklift",
    data: number
  ) => {
    console.log(`Sending to ${key}:`, chars.current[key]);
    const characteristic = chars.current[key];
    if (!characteristic) {
      console.warn(`[BLE] Characteristic '${key}' not found. Skipping write.`);
      return;
    }
    try {
      const valueStr = data.toString();
      const base64 = Buffer.from(valueStr, "utf-8").toString("base64");
      characteristic
        .writeWithoutResponse(base64)
        .then(() => {
          console.log("[BLE] Sent base64:", base64, "for", key);
        })
        .catch((error: any) => {
          console.error("[BLE] Write error:", error);
        });
    } catch (err) {
      console.error("[BLE] Send error:", err);
    }
  };

  // Lock screen orientation to landscape
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // If disconnected, remove device and navigate back/home
  useEffect(() => {
    if (!isConnected) {
      removeDevice();
      if (router.canGoBack()) router.back();
      else router.replace("/home");
    }
  }, [isConnected, removeDevice]);

  // UI header toggle state and animation
  const insets = useSafeAreaInsets();
  const [showHeader, setShowHeader] = useState(true);
  const headerTransform = useSharedValue(0);

  useEffect(() => {
    if (showHeader) {
      setTimeout(() => {
        setShowHeader(false);
        headerTransform.value = withTiming(1, { duration: 300 });
      }, 3000);
    }
  }, [showHeader]);

  const animateToggle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(headerTransform.value === 0 ? "-90deg" : "90deg", {
          duration: 300,
        }),
      },
    ],
  }));

  // BLE disconnect handler
  const handleBleDisconnect = useCallback(async () => {
    if (connectedDevice) {
      await bleService.disconnectFromDevice(connectedDevice.id);
      setIsConnected(false);
      chars.current = {};
      if (monitorSub.current) {
        monitorSub.current.remove();
        monitorSub.current = null;
      }
      removeDevice();
      if (router.canGoBack()) router.back();
      else console.warn("No previous screen to go back to");
    }
  }, [connectedDevice, bleService, removeDevice]);

  // Android hardware back handler
  useEffect(() => {
    const handle = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBleDisconnect();
      return true;
    });
    return () => {
      handle.remove();
    };
  }, [handleBleDisconnect]);

  return (
    <>
      <StatusBar hidden={true} />
      <View style={styles.container}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
              width: "100%",
            },
          ]}
        >
          {showHeader && (
            <Animated.View
              entering={enter}
              exiting={exit}
              style={[
                styles.header,
                {
                  paddingLeft: insets.left,
                  paddingRight: 16,
                },
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: "white",
                },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Icon
                  name="arrowleft"
                  size={18}
                  onPress={async () => {
                    await handleBleDisconnect();
                    if (router.canGoBack()) router.back();
                    else console.warn("No previous screen to go back to");
                  }}
                />
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  {connectedDevice
                    ? connectedDevice.name ||
                      connectedDevice.localName ||
                      "Unnamed Device"
                    : "No Device"}
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Chip
                  mode={"flat"}
                  style={{
                    backgroundColor: isConnected ? "#23522e" : "#f57a85",
                  }}
                  selected={isConnected}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </Chip>
              </View>
            </Animated.View>
          )}
          {!showHeader && (
            <Animated.View
              style={[
                styles.toggleBtn,
                {
                  marginLeft: insets.left,
                },
                animateToggle,
              ]}
            >
              <TouchableNativeFeedback onPress={() => setShowHeader((v) => !v)}>
                <Icon name="left" size={16} />
              </TouchableNativeFeedback>
            </Animated.View>
          )}
        </Animated.View>

        <View
          style={[
            styles.controls,
            {
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              flexGrow: 0,
              paddingLeft: insets.left + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View
            style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}
          >
            <RealisticSteeringWheel
              size={200}
              onSteer={(e) => {
                handleSendData("steering", e);
                setData({ steering: e });
              }}
            />
          </View>
        </View>

        <View
          style={[
            styles.controls,
            {
              paddingRight: insets.right + 16,
              paddingBottom: insets.bottom + 16,
              alignItems: "flex-end",
              justifyContent: "flex-end",
              height: "100%",
              backgroundColor: "#f0f0f0",
              gap: 12,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              gap: 12,
            }}
          >
            <Fab
              onItemPress={(i, idx) => setData({ PRND: idx })}
              value={PRND}
            />
            <Slider
              min={0}
              vertical
              max={100}
              sendValue={(v) => {
                handleSendData("throttle", v);
                setData({ throttle: v });
              }}
              size={200}
              returnToValue={0}
              initial={0}
            />
          </View>

          <Slider
            min={-100}
            max={100}
            vertical={false}
            returnToValue={33}
            sendValue={(v) => {
              handleSendData("forklift", v);
              setData({ forklift: v });
            }}
            size={300}
            initial={33}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    flexDirection: "row",
    position: "relative",
    top: 0,
  },
  header: {
    width: "100%",
    height: 60,
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controls: {
    flexDirection: "column",
    flexGrow: 1,
  },
  toggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
});
