import {
  useAnimatedScrollHandler,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { TouchableOpacity, View, PanResponder } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useBLEManager } from "../hooks/useBLEManager";
import { DeviceList } from "../components/DeviceList";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, Text } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { StyleSheet } from "react-native";
import SteeringWheel from "../components/ui/steering";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import RealisticSteeringWheel from "../components/ui/steering";
import React from "react";
import useBluetooth from "../hooks/useBluetooth";
import { openSettings } from "react-native-permissions";

export default function App() {
  const { isBluetoothEnabled } = useBluetooth();
  const {
    scanning,
    setScanning,
    isConnecting,
    connect,
    deviceList,
    connectedDevice,
    requestPermissions,
  } = useBLEManager();

  const oscillation = useSharedValue(0);

  useEffect(() => {
    if (scanning) {
      oscillation.value = withRepeat(
        withTiming(2 * Math.PI, { duration: 1000 }),
        -1,
        false
      );
    } else {
      oscillation.value = 0;
      pullDownPosition.value = withTiming(0, { duration: 250 });
    }
  }, [scanning]);

  const loadingAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: scanning ? Math.sin(oscillation.value) * 5 : 0,
        },
      ],
    };
  });

  const scrollPosition = useSharedValue(0);
  const isReadyToRefresh = useSharedValue(false);

  const pullDownPosition = useSharedValue(0);

  const onPanRelease = async () => {
    pullDownPosition.value = withTiming(isReadyToRefresh.value ? 75 : 0, {
      duration: 180,
    });
    if (isReadyToRefresh.value) {
      isReadyToRefresh.value = false;
      if (!scanning) {
        setScanning(true);
        await requestPermissions();
      }
    }
  };

  const panResponderRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (event, gestureState) =>
        scrollPosition.value <= 0 && gestureState.dy >= 0,
      onPanResponderMove: (event, gestureState) => {
        const maxDistance = 240;
        pullDownPosition.value = Math.max(
          Math.min(maxDistance, gestureState.dy),
          0
        );
        if (
          pullDownPosition.value >= maxDistance / 2 &&
          isReadyToRefresh.value === false
        ) {
          isReadyToRefresh.value = true;
          setScanning(true);
        }
        if (
          pullDownPosition.value < maxDistance / 2 &&
          isReadyToRefresh.value === true
        ) {
          isReadyToRefresh.value = false;
        }
      },
      onPanResponderRelease: onPanRelease,
      onPanResponderTerminate: onPanRelease,
    })
  );

  const pullDownStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: pullDownPosition.value,
        },
      ],
    };
  });
  const refreshContainerStyles = useAnimatedStyle(() => {
    return {
      height: pullDownPosition.value,
    };
  });

  const refreshIconStyles = useAnimatedStyle(() => {
    return {
      opacity: Math.max(0, pullDownPosition.value - 25) / 50,
      transform: [
        {
          scale: Math.max(0.5, Math.min(1, pullDownPosition.value / 50)),
        },
      ],
    };
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setScanning(true);
    pullDownPosition.value = withTiming(75, { duration: 180 });
    isReadyToRefresh.value = true;
    await requestPermissions();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleNext = () => {
    router.push("/device");
  };

  return isBluetoothEnabled === null || !isBluetoothEnabled ? (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Not Connected</Text>
        <Button
          onPress={() => {
            // router.reload(); --- IGNORE ---
            openSettings();
          }}
        >
          Open Settings
        </Button>
      </View>
    </SafeAreaView>
  ) : (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <Animated.View style={styles.root}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <Text
            variant="displayLarge"
            style={{ marginBottom: 12, fontFamily: "Syne_800ExtraBold" }}
          >
            Nearby Devices
          </Text>
          <TouchableOpacity onPress={handleManualRefresh} disabled={refreshing}>
            <MaterialIcons
              name="refresh"
              size={28}
              color={refreshing ? "gray" : "black"}
            />
          </TouchableOpacity>
        </View>
        <View
          style={{ flex: 1, backgroundColor: "#dedede", position: "relative" }}
        >
          <Animated.View
            style={[styles.refreshContainer, refreshContainerStyles]}
          >
            <Animated.View
              style={[
                refreshIconStyles,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <Animated.View style={[scanning && loadingAnimation]}>
                <MaterialIcons
                  name="bluetooth-searching"
                  size={32}
                  color="black"
                />
              </Animated.View>
              <Text variant="bodySmall" style={{ marginTop: 4 }}>
                {scanning
                  ? "Scanning for devices..."
                  : refreshing
                  ? "Refreshing..."
                  : "Pull to refresh or tap refresh icon"}
              </Text>
            </Animated.View>
          </Animated.View>
          <Animated.View
            style={[
              {
                paddingHorizontal: 16,
                paddingTop: 0,
                flex: 1,
                width: "100%",
                backgroundColor: "white",
              },
              pullDownStyles,
            ]}
            {...panResponderRef.current.panHandlers}
          >
            <DeviceList
              devices={deviceList}
              isConnecting={isConnecting}
              connectedDevice={connectedDevice}
              onConnect={(device) => connect(device, handleNext)}
              onControl={handleNext}
            />
          </Animated.View>
          <Button
            onPress={() => {
              router.push("/device");
            }}
          >
            Redirect
          </Button>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: "relative",
    top: 0,
  },
  refreshContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  refreshIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 36,
    height: 36,
    marginTop: -18,
    marginLeft: -18,
    borderRadius: 18,
    objectFit: "contain",
  },
});
