// RealTimeSlider.tsx
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from "react-native-reanimated";

type Props = {
  min: number;
  max: number;
  size?: number; // track length in px
  thickness?: number;
  vertical?: boolean;
  initial?: number;
  // MUST be provided - should be very fast (enqueue to buffer / write to socket)
  sendValue: (v: number, ts: number) => void;
  // called on gesture end or safety events
  onComplete?: (v: number) => void;
  // return-to-value (e.g., 0) when released, set to null to keep at finger
  returnToValue?: number | null;
  step?: number; // optional logical step
};

const DEFAULT_SIZE = 300;
const THUMB_SIZE = 28;

export default function RealTimeSlider({
  min,
  max,
  size = DEFAULT_SIZE,
  thickness = 30,
  vertical = false,
  initial = 0,
  sendValue,
  onComplete,
  returnToValue = null,
  step = 0,
}: Props) {
  // rawValue = exact instantaneous logical value (worklet updated every frame)
  const rawValue = useSharedValue(initial);
  // animatedValue = follows rawValue with spring for UI
  const animatedValue = useSharedValue(initial);

  // Throttle control: last send timestamp on UI thread
  const lastSentTs = useSharedValue(0);
  const SEND_INTERVAL_MS = 20; // 50Hz. Adjust to 10ms (100Hz) if your system supports it.

  const trackRange = Math.max(1, size - THUMB_SIZE); // px usable

  // Move inside component or top-level, but add "worklet"
  const clamp = (v: number, min: number, max: number): number => {
    "worklet";
    return Math.max(min, Math.min(max, v));
  };

  const valueToPos = (
    v: number,
    min: number,
    max: number,
    trackRange: number,
    vertical: boolean
  ): number => {
    "worklet";
    const ratio = (clamp(v, min, max) - min) / (max - min);
    return vertical ? (1 - ratio) * trackRange : ratio * trackRange;
  };

  const posToValue = (
    pos: number,
    min: number,
    max: number,
    trackRange: number,
    vertical: boolean,
    step?: number
  ): number => {
    "worklet";
    const p = Math.max(0, Math.min(trackRange, pos));
    const ratio = vertical ? 1 - p / trackRange : p / trackRange;
    let raw = min + ratio * (max - min);
    if (step && step > 0) raw = Math.round(raw / step) * step;
    return clamp(raw, min, max);
  };

  // JS-side function is provided; we must guard it.
  // IMPORTANT: ensure sendValue is extremely cheap (enqueue into buffer/socket)
  const safeSendValue = (v: number, ts: number) => {
    try {
      sendValue(v, ts);
    } catch (e) {
      // swallow, log on JS side (avoid exceptions thrown from runOnJS)
      // console.warn("sendValue failed", e);
    }
  };

  // Gesture start snapshot in a shared value
  const startPos = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startPos.value = valueToPos(
        rawValue.value,
        min,
        max,
        trackRange,
        vertical
      );
    })
    .onUpdate((ev) => {
      "worklet";
      if (vertical) {
        // --- Vertical handling ---
        const deltaY = ev.translationY; // invert so up = positive
        const newPos = Math.max(
          0,
          Math.min(trackRange, startPos.value + deltaY)
        );
        const newRaw = posToValue(newPos, min, max, trackRange, vertical, step);

        rawValue.value = newRaw;
        animatedValue.value = withSpring(newRaw, {
          stiffness: 300,
          damping: 28,
        });

        const now = Date.now();
        if (now - lastSentTs.value >= SEND_INTERVAL_MS) {
          lastSentTs.value = now;
          runOnJS(safeSendValue)(newRaw, now);
        }
      } else {
        // --- Horizontal handling ---
        const deltaX = ev.translationX;
        const newPos = Math.max(
          0,
          Math.min(trackRange, startPos.value + deltaX)
        );
        const newRaw = posToValue(newPos, min, max, trackRange, vertical, step);

        rawValue.value = newRaw;
        animatedValue.value = withSpring(newRaw, {
          stiffness: 300,
          damping: 28,
        });

        const now = Date.now();
        if (now - lastSentTs.value >= SEND_INTERVAL_MS) {
          lastSentTs.value = now;
          runOnJS(safeSendValue)(newRaw, now);
        }
      }
    })
    .onEnd(() => {
      "worklet";
      // final immediate send (ensure controller receives final)
      const now = Date.now();
      lastSentTs.value = now;
      runOnJS(safeSendValue)(rawValue.value, now);

      if (returnToValue !== null && returnToValue !== undefined) {
        // animate UI spring back, and update raw as well (instant)
        rawValue.value = returnToValue;
        animatedValue.value = withSpring(returnToValue, {
          stiffness: 200,
          damping: 20,
        });
        runOnJS(safeSendValue)(returnToValue, Date.now());
      }
      // signal completion on JS thread
      if (onComplete) runOnJS(onComplete)(rawValue.value);
    });

  // UI styles driven by animatedValue (NOT rawValue)
  const fillStyle = useAnimatedStyle(() => {
    const ratio = (animatedValue.value - min) / (max - min);
    return vertical
      ? {
          position: "absolute",
          bottom: 0,
          left: 0,
          width: thickness,
          height: ratio * size,
          backgroundColor: "#007AFF",
        }
      : {
          position: "absolute",
          left: 0,
          top: 0,
          width: ratio * size,
          height: thickness,
          backgroundColor: "#007AFF",
        };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const pos = valueToPos(animatedValue.value, min, max, trackRange, vertical);
    return vertical
      ? {
          transform: [{ translateY: pos }],
          left: (thickness - THUMB_SIZE) / 2,
        }
      : { transform: [{ translateX: pos }], top: (thickness - THUMB_SIZE) / 2 };
  });

  // If parent updates `initial` externally, bring both values in sync
  useEffect(() => {
    rawValue.value = initial;
    animatedValue.value = withSpring(initial, { stiffness: 200, damping: 20 });
  }, [initial]);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={[
          {
            width: vertical ? thickness : size,
            height: vertical ? size : thickness,
          },
          { overflow: "hidden", borderRadius: 8, backgroundColor: "#ccc" },
        ]}
      >
        <Animated.View style={fillStyle} />
        <Animated.View
          style={[
            thumbStyle,
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              position: "absolute",
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#999",
              elevation: 4,
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
}
