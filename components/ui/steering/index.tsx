import React, { useCallback, useRef } from "react";
import { View, StyleSheet, LayoutChangeEvent, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useDerivedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

interface SteeringWheelProps {
  size?: number;
  minAngle?: number; // default 60
  maxAngle?: number; // default 120
  onSteer?: (uiAngle: number, raw: number) => void;
}

const SteeringWheel: React.FC<SteeringWheelProps> = ({
  size = 250,
  minAngle = 60,
  maxAngle = 120,
  onSteer,
}) => {
  const angle = useSharedValue(0); // rotation in radians
  const lastAngle = useSharedValue(0);
  const center = useSharedValue({ x: 0, y: 0 });

  // Throttle onSteer to max ~30 calls/sec
  const lastCallTime = useSharedValue(0);
  const throttleMs = 33; // ~30 FPS

  // Worklet function to map raw (-1..1) to UI angle
  const mapToUIRange = (raw: number) => {
    "worklet";
    const clamped = Math.max(-1, Math.min(1, raw));
    return minAngle + (clamped + 1) * ((maxAngle - minAngle) / 2);
  };

  // Derived values to minimize repeated calculations
  const raw = useDerivedValue(() => {
    return angle.value / (Math.PI / 4);
  });

  const uiAngle = useDerivedValue(() => {
    return mapToUIRange(raw.value);
  });

  // Throttled call to onSteer on JS thread
  const callOnSteerThrottled = useCallback(
    (angleVal: number, rawVal: number) => {
      "worklet";
      const now = Date.now();
      if (now - lastCallTime.value > throttleMs) {
        lastCallTime.value = now;
        if (onSteer) runOnJS(onSteer)(angleVal, rawVal);
      }
    },
    [onSteer]
  );

  const pan = Gesture.Pan()
    .onBegin((event) => {
      const dx = event.x - center.value.x;
      const dy = event.y - center.value.y;
      lastAngle.value = Math.atan2(dy, dx);
    })
    .onUpdate((event) => {
      const dx = event.x - center.value.x;
      const dy = event.y - center.value.y;
      const current = Math.atan2(dy, dx);

      // Calculate delta carefully to handle angular wrapping
      let delta = current - lastAngle.value;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      angle.value += delta;
      lastAngle.value = current;

      // Throttle JS calls for performance
      callOnSteerThrottled(uiAngle.value, raw.value);
    })
    .onEnd(() => {
      angle.value = withSpring(0, { damping: 20, stiffness: 120 });
      if (onSteer) runOnJS(onSteer)(90, 0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${uiAngle.value - 90}deg` }],
      // Hardware accelerated layer on Android
      // No direct prop for this in Reanimated style, must be prop on Animated.View below
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    center.value = { x: width / 2, y: height / 2 };
  };

  return (
    <View onLayout={onLayout}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            { width: size, height: size, borderRadius: size / 2 },
            animatedStyle,
          ]}
          renderToHardwareTextureAndroid // Enable GPU rendering on Android
          shouldRasterizeIOS // Optimize on iOS
        >
          <Image
            source={require("../../../assets/steering.png")}
            style={{ width: size, height: size }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SteeringWheel;
