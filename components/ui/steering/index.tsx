import React from "react";
import { View, StyleSheet, LayoutChangeEvent, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
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
  const angle = useSharedValue(0); // cumulative rotation in radians
  const lastAngle = useSharedValue(0);
  const center = useSharedValue({ x: 0, y: 0 });

  const mapToUIRange = (raw: number) => {
    "worklet";
    // raw normalized to -1..1 (±45°)
    const clamped = Math.max(-1, Math.min(1, raw));
    return minAngle + (clamped + 1) * ((maxAngle - minAngle) / 2);
  };

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

      // delta between last and current
      let delta = current - lastAngle.value;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      angle.value += delta;
      lastAngle.value = current;

      // normalize rotation → -1..1 relative to 45°
      const raw = angle.value / (Math.PI / 4);
      const uiAngle = mapToUIRange(raw);

      if (onSteer) runOnJS(onSteer)(uiAngle, raw);
    })
    .onEnd(() => {
      // snap back to center (90°) with smoother animation
      angle.value = withSpring(0, { damping: 20, stiffness: 120 });
      if (onSteer) runOnJS(onSteer)(90, 0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const raw = angle.value / (Math.PI / 4);
    const uiAngle = mapToUIRange(raw);
    return {
      transform: [{ rotate: `${uiAngle - 90}deg` }],
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
