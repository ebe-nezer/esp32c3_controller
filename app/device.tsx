import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Button,
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableNativeFeedback,
  BackHandler,
  Dimensions,
} from "react-native";
import { BLEServiceFactory } from "../utils/ble";
import { useDataStore, useDeviceStore } from "../zustand";
import { Buffer } from "buffer";
import * as ScreenOrientation from "expo-screen-orientation";
import { router } from "expo-router";
import Steering from "../components/ui/steering";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
import Speedometer from "../components/ui/speedometer";

const WRITE_UUID = "abcdefab-1234-5678-1234-abcdefabcdef";
const NOTIFY_UUID = "fedcba98-4321-4321-4321-abcdefabcdef";

const enter = FadeInDown.springify(16).damping(16);
const exit = FadeOutDown.springify(16).damping(16);

export default function App() {
  const { connectedDevice, removeDevice } = useDeviceStore();
  const [writeChar, setWriteChar] = useState<Characteristic | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const bleService = BLEServiceFactory.createService("ESP32C3");
  const monitorSub = useRef<any>(null);

  const {
    setThrottle,
    setForklift,
    setPRND,
    setSteering,
    throttle,
    forklift,
    PRND,
    steering,
  } = useDataStore();

  useEffect(() => {
    useDataStore.subscribe((state) => {
      sendRealTimeData();
    });
  }, []);

  const sendRealTimeData = useCallback(() => {
    if (!writeChar) return;
    const values = {
      steering: parseInt(`${steering}`),
      throttle: parseInt(`${throttle}`),
      prnd: PRND,
      forklift: parseInt(`${forklift}`),
    };
    let payload = "";
    try {
      payload = JSON.stringify(values);
    } catch (error: any) {
      console.error(`[ERROR] Failed to parse JSON: ${error?.message || error}`);
      return;
    }
    const base64Payload = Buffer.from(payload, "utf-8").toString("base64");
    writeChar
      .writeWithoutResponse(base64Payload)
      .catch((err: Error) => {
        console.error("Failed to send real-time data:", err);
      })
      .then(() => {
        console.log("Sent data:", values);
      });
  }, [writeChar, steering, throttle, forklift]);

  useEffect(() => {
    let disconnectSub: any = null;
    const connectAndDiscover = async () => {
      if (!connectedDevice) return;
      try {
        const device = await bleService.connectToDevice(connectedDevice.id);
        setIsConnected(true);
        disconnectSub = device.onDisconnected((error, dev) => {
          setIsConnected(false);
          setWriteChar(null);
          if (monitorSub.current) {
            monitorSub.current.remove();
            monitorSub.current = null;
          }
          removeDevice();
        });
        await device.discoverAllServicesAndCharacteristics();
        const services = await device.services();
        const service = services.find(
          (s) => s.uuid.toLowerCase() === "12345678-1234-1234-1234-123456789abc"
        );
        if (!service) return;
        const characteristics = await device.characteristicsForService(
          service.uuid
        );
        const write = characteristics.find(
          (c) => c.uuid.toLowerCase() === WRITE_UUID
        );
        if (!write) return;
        setWriteChar(write);
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
        handleBleDisconnect();
        monitorSub.current = null;
      }
    };
  }, [connectedDevice]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  useEffect(() => {
    if (!isConnected) {
      removeDevice();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }
  }, [isConnected]);

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

  const animateToggle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withTiming(headerTransform.value === 0 ? "-90deg" : "90deg", {
            duration: 300,
          }),
        },
      ],
    };
  });

  const handleBleDisconnect = useCallback(async () => {
    if (connectedDevice) {
      await bleService.disconnectFromDevice(connectedDevice.id);
      setIsConnected(false);
      setWriteChar(null);
      if (monitorSub.current) {
        monitorSub.current.remove();
        monitorSub.current = null;
      }
      removeDevice();
      if (router.canGoBack()) router.back();
      else console.warn("No previous screen to go back to");
    }
  }, [connectedDevice, bleService, removeDevice]);

  useEffect(() => {
    const handle = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBleDisconnect();
      return true;
    });
    return () => {
      handle.remove();
    };
  }, []);

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
                setSteering(e);
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
            <Fab onItemPress={(i, idx) => setPRND(idx)} value={PRND} />
            <Slider
              min={0}
              vertical
              max={100}
              sendValue={(v) => setThrottle(v)}
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
            sendValue={(v) => setForklift(v)}
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
