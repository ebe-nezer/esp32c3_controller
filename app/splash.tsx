import { Image, View } from "react-native";
import { ProgressBar } from "react-native-paper";
import useUpdates from "../hooks/useUpdates";
import React from "react";
import { router } from "expo-router";

export default function Splash() {
  const { checking, error, updateAvailable } = useUpdates();

  React.useEffect(() => {
    if (!updateAvailable || error) {
      router.replace("/home");
      return;
    }
  }, [updateAvailable, error]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
        gap: 24,
      }}
    >
      <Image
        source={require("../assets/ios-dark.png")}
        width={200}
        height={200}
        style={{
          width: 200,
          height: 200,
          borderRadius: 20,
          objectFit: "contain",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}
        resizeMode="contain"
      />
      {checking && <ProgressBar indeterminate style={{ width: 200 }} />}
    </View>
  );
}
