import React from "react";
import {
  StyleProp,
  ViewStyle,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedText = Animated.createAnimatedComponent(Text);

type Props = {
  style?: StyleProp<ViewStyle>;
  onItemPress?: (item: string, value: "R" | "D") => void;
  value?: "R" | "D";
};

const values: ["R", "D"] = ["R", "D"];

const HANDLER_SIZE = 34;
const SWIPABLE_SIZE = HANDLER_SIZE - 12;

const Fab = ({ onItemPress, value }: Props) => {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (value && values[index] !== value) {
      const newIndex = values.indexOf(value);
      if (newIndex !== -1) {
        setIndex(newIndex);
      }
    }
  }, [value]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      left: withSpring(index * HANDLER_SIZE + 6),
    }),
    [index]
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.swipable,
            {
              left: 6,
              width: SWIPABLE_SIZE,
              height: SWIPABLE_SIZE,
              borderRadius: SWIPABLE_SIZE / 2,
            },
            animatedStyle,
          ]}
        />
        {values.map((d) => {
          const isActive = index === values.indexOf(d);
          return (
            <TouchableOpacity
              key={d}
              activeOpacity={0.8}
              onPress={() => {
                onItemPress?.(d, d);
                setIndex(values.indexOf(d));
              }}
            >
              <View
                style={[
                  {
                    width: HANDLER_SIZE,
                    height: HANDLER_SIZE,
                    borderRadius: HANDLER_SIZE / 2,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <AnimatedText
                  style={[
                    {
                      color: isActive ? "#fff" : "gray",
                      fontSize: HANDLER_SIZE / 2.2,
                    },
                  ]}
                >
                  {d}
                </AnimatedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default Fab;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#1d1d1d",
    borderRadius: 24,
    alignSelf: "center",
  },
  row: {
    position: "relative",
    flexDirection: "row",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  swipable: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#69e8ff56",
    zIndex: -10,
  },
  touchable: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
