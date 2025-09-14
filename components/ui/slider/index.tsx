import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const THUMB_SIZE = 30;

const calculateValue = (
  position: number,
  min: number,
  max: number,
  size: number,
  vertical: boolean
): number => {
  "worklet";
  // Flip Y for vertical (so bottom = min, top = max)
  let sliderPosition = vertical ? size - position : position;

  // clamp position
  sliderPosition = Math.min(Math.max(sliderPosition, 0), size);

  // convert to value
  let value = (sliderPosition / size) * (max - min) + min;
  return Math.min(Math.max(value, min), max);
};

const Slider = ({
  min = 0,
  max = 100,
  size = 300,
  thickness = 30,
  vertical = false,
  onChange = () => {},
  value: iv = 0,
  trackColor = "#ccc",
  fillColor = "#007AFF",
  disabled = false,
  returnToValue = null,
  initialValue = 0,
  step = 1,
}: {
  min?: number;
  max?: number;
  size?: number;
  step?: number;
  thickness?: number;
  vertical?: boolean;
  onChange?: (value: number) => void;
  value?: number;
  trackColor?: string;
  fillColor?: string;
  disabled?: boolean;
  returnToValue?: number | null;
  initialValue?: number;
}) => {
  const value = useSharedValue(initialValue);
  const isDisabled = useSharedValue(disabled);

  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      "worklet";
      if (isDisabled.get()) return;
      const newValue = calculateValue(
        vertical ? event.y : event.x,
        min,
        max,
        size - THUMB_SIZE,
        vertical
      );
      value.value = withSpring(newValue, { stiffness: 200, damping: 20 });
      runOnJS(onChange)(newValue);
    })
    .onUpdate((event) => {
      "worklet";
      if (isDisabled.get()) return;
      const newValue = calculateValue(
        vertical ? event.y : event.x,
        min,
        max,
        size - THUMB_SIZE,
        vertical
      );
      value.value = withSpring(newValue, { stiffness: 200, damping: 20 });
      runOnJS(onChange)(newValue);
    })
    .onEnd(() => {
      "worklet";
      if (isDisabled.get()) return;
      value.value = withSpring(returnToValue || 0, {
        stiffness: 75,
        damping: 50,
      });
      runOnJS(onChange)(returnToValue || 0);
      // runOnJS(handleComplete)();
    });

  const fillStyle = useAnimatedStyle(() => {
    const ratio = (value.value - min) / (max - min);
    return vertical
      ? {
          height: ratio * size,
          width: thickness,
          backgroundColor: fillColor,
          position: "absolute",
          bottom: 0, // anchor bottom
          left: 0,
          zIndex: 10,
          borderRadius: 15,
        }
      : {
          width: ratio * size,
          height: thickness,
          backgroundColor: fillColor,
          position: "absolute",
          left: 0,
          top: 0,
          borderRadius: 15,
        };
  });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        vertical
          ? {
              translateY:
                ((max - value.value) / (max - min)) * (size - THUMB_SIZE),
            }
          : {
              translateX:
                ((value.value - min) / (max - min)) * (size - THUMB_SIZE),
            },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[
          styles.track,
          vertical
            ? {
                height: size,
                width: thickness,
                backgroundColor: trackColor,
                paddingVertical: THUMB_SIZE / 2,
              }
            : {
                width: size,
                height: thickness,
                backgroundColor: trackColor,
                paddingHorizontal: THUMB_SIZE / 2,
              },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            thumbStyle,
            vertical
              ? {
                  left: (thickness - THUMB_SIZE) / 2,
                }
              : {
                  top: (thickness - THUMB_SIZE) / 2,
                },
          ]}
        />
        <Animated.View
          style={[
            fillStyle,
            {
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
    borderRadius: 15,
  },
  thumb: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#999",
    zIndex: 100,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default Slider;
