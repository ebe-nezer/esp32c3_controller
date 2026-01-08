import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
  useDerivedValue,
} from "react-native-reanimated";

type Props = {
  min: number;
  max: number;
  size?: number; // track length in px
  thickness?: number;
  vertical?: boolean;
  initial?: number;
  sendValue: (v: number, ts: number) => void; // MUST be fast (enqueue/write)
  onComplete?: (v: number) => void; // called at gesture end
  returnToValue?: number | null; // spring back when released
  step?: number; // optional step size
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
  const rawValue = useSharedValue(initial);
  const animatedValue = useSharedValue(initial);

  const lastSentTs = useSharedValue(0);
  const SEND_INTERVAL_MS = 20; // 50Hz throttle

  const trackRange = Math.max(1, size - THUMB_SIZE);

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

  const safeSendValue = (v: number, ts: number) => {
    try {
      sendValue(v, ts);
    } catch (e) {
      // swallow to avoid throwing inside runOnJS
    }
  };

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
      const delta = vertical ? ev.translationY : ev.translationX;
      const newPos = Math.max(0, Math.min(trackRange, startPos.value + delta));
      const newRaw = posToValue(newPos, min, max, trackRange, vertical, step);

      rawValue.value = newRaw;
      animatedValue.value = withTiming(newRaw, { duration: 50 });

      const now = Date.now();
      if (now - lastSentTs.value >= SEND_INTERVAL_MS) {
        lastSentTs.value = now;
        runOnJS(safeSendValue)(newRaw, now);
      }
    })
    .onEnd(() => {
      "worklet";
      const now = Date.now();
      lastSentTs.value = now;
      runOnJS(safeSendValue)(rawValue.value, now);

      if (returnToValue !== null && returnToValue !== undefined) {
        rawValue.value = returnToValue;
        animatedValue.value = withTiming(returnToValue, { duration: 100 });
        runOnJS(safeSendValue)(returnToValue, Date.now());
      }

      if (onComplete) runOnJS(onComplete)(rawValue.value);
    });

  const ratio = useDerivedValue(
    () => (animatedValue.value - min) / (max - min)
  );

  const fillStyle = useAnimatedStyle(() => {
    return vertical
      ? {
          position: "absolute",
          bottom: 0,
          left: 0,
          width: thickness,
          height: ratio.value * size,
          backgroundColor: "#007AFF",
        }
      : {
          position: "absolute",
          left: 0,
          top: 0,
          width: ratio.value * size,
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
      : {
          transform: [{ translateX: pos }],
          top: (thickness - THUMB_SIZE) / 2,
        };
  });

  useEffect(() => {
    rawValue.value = initial;
    animatedValue.value = withTiming(initial, { duration: 100 });
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
        <Animated.View
          style={fillStyle}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        />
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
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        />
      </View>
    </GestureDetector>
  );
}
