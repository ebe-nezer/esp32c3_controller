import React, { useEffect, useState, useRef } from "react";
import {
  Button,
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableNativeFeedback,
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

const WRITE_UUID = "abcdefab-1234-5678-1234-abcdefabcdef";
const NOTIFY_UUID = "fedcba98-4321-4321-4321-abcdefabcdef";

const enter = FadeInDown.springify(16).damping(16);
const exit = FadeOutDown.springify(16).damping(16);

export default function App() {
  const { connectedDevice, removeDevice } = useDeviceStore();
  const [messages, setMessages] = useState<string[]>([]);
  const [writeChar, setWriteChar] = useState<any>(null);
  const [notifyChar, setNotifyChar] = useState<any>(null);
  const [channel, setChannel] = useState("throttle");
  const [value, setValue] = useState("80");
  const [isConnected, setIsConnected] = useState(true);
  const bleService = BLEServiceFactory.createService("ESP32C3");
  const monitorSub = useRef<any>(null);

  useEffect(() => {
    let disconnectSub: any = null;
    const connectAndDiscover = async () => {
      if (!connectedDevice) return;
      try {
        // Connect and discover services/characteristics
        const device = await bleService.connectToDevice(connectedDevice.id);
        setIsConnected(true);
        // Listen for disconnect
        disconnectSub = device.onDisconnected((error, dev) => {
          setIsConnected(false);
          setWriteChar(null);
          setNotifyChar(null);
          if (monitorSub.current) {
            monitorSub.current.remove();
            monitorSub.current = null;
          }
          removeDevice(); // Remove device on disconnect
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
        const notify = characteristics.find(
          (c) => c.uuid.toLowerCase() === NOTIFY_UUID
        );
        setWriteChar(write);
        setNotifyChar(notify);
        // Monitor notifications
        if (notify) {
          monitorSub.current = device.monitorCharacteristicForService(
            service.uuid,
            notify.uuid,
            (error, characteristic) => {
              if (error) {
                console.error("Notification error:", error);
                return;
              }
              if (characteristic?.value) {
                const decoded = Buffer.from(
                  characteristic.value,
                  "base64"
                ).toString("utf-8");
                setMessages((prev) => [...prev, decoded]);
              }
            }
          );
        }
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
  }, [connectedDevice]);

  useEffect(() => {
    // Lock screen orientation to landscape
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      // Unlock on cleanup
      ScreenOrientation.unlockAsync();
    };
  }, []);

  const sendMessage = async () => {
    if (!writeChar) return;
    try {
      const payload = JSON.stringify({ [channel]: value });
      const base64Payload = Buffer.from(payload, "utf-8").toString("base64");
      await writeChar.writeWithResponse(base64Payload);
      console.log("Message sent:", payload);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

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

  const handleBleDisconnect = async () => {
    if (connectedDevice) {
      await bleService.disconnectFromDevice(connectedDevice.id);
      setIsConnected(false);
      setWriteChar(null);
      setNotifyChar(null);
      if (monitorSub.current) {
        monitorSub.current.remove();
        monitorSub.current = null;
      }
      removeDevice();
      if (router.canGoBack()) router.back();
      else console.warn("No previous screen to go back to");
    }
  };

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

  const handleTransmit = async () => {
    const values = {
      steering: parseInt(`${steering}`),
      throttle: parseInt(`${throttle}`),
      forklift: parseInt(`${forklift}`),
    };
    if (!writeChar) return;
    try {
      const payload = JSON.stringify(values);
      const base64Payload = Buffer.from(payload, "utf-8").toString("base64");
      await writeChar.writeWithResponse(base64Payload);
      console.log("Message sent:", payload);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

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
          <RealisticSteeringWheel
            size={200}
            onSteer={(e) => {
              setSteering(e);
              handleTransmit();
            }}
          />
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
              value={PRND === "D" ? throttle : PRND === "R" ? -throttle : 0}
              size={200}
              initialValue={0}
              returnToValue={0}
              onChange={(e) => {
                if (PRND === "D") setThrottle(e);
                else setThrottle(-e);
                handleTransmit();
              }}
            />
          </View>
          <Slider
            min={-100}
            initialValue={33}
            max={100}
            vertical={false}
            value={forklift}
            returnToValue={33}
            onChange={(e) => {
              setForklift(e);
              handleTransmit();
            }}
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
