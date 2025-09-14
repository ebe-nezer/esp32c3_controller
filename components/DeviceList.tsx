import React from "react";
import { Device } from "react-native-ble-plx";
import { ActivityIndicator, Text } from "react-native-paper";
import { TouchableOpacity, View } from "react-native";

const loadingDots = () => {
  const [dots, setDots] = React.useState("");
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return dots;
};

export function DeviceList({
  devices,
  isConnecting,
  connectedDevice,
  onConnect,
  onControl,
}: {
  devices: Device[];
  isConnecting: {
    id: string;
    connecting: boolean;
    connected: boolean;
    error: string;
  };
  connectedDevice: Device | null;
  onConnect: (device: Device) => void;
  onControl: () => void;
}) {
  return (
    <>
      {devices.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={{
            padding: 12,
            borderBottomWidth: 1,
            borderColor: "#ddd",
          }}
          onPress={() => onConnect(item)}
          accessibilityLabel={`Connect to ${
            item.name || item.localName || "Unnamed Device"
          }`}
          accessibilityRole="button"
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <View style={{ flexDirection: "column", flexGrow: 1 }}>
              <Text style={{ fontSize: 16 }}>
                {item.name || item.localName || "Unnamed Device"}
              </Text>
              <Text
                variant="bodySmall"
                style={{ fontSize: 12, color: "gray", fontFamily: "monospace" }}
              >
                {item?.serviceUUIDs?.join(", ") || item.id}
              </Text>
            </View>
            <View style={{ flexDirection: "column" }}>
              {isConnecting.id === item.id && isConnecting.connecting && (
                <View
                  style={{
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text>
                    Establishing Connection
                    {loadingDots()}
                  </Text>
                </View>
              )}
              {isConnecting.id === item.id && isConnecting.connected && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onControl();
                  }}
                  style={{ flexDirection: "column", alignItems: "center" }}
                >
                  <Text variant="bodySmall" style={{ color: "green" }}>
                    Control
                  </Text>
                </TouchableOpacity>
              )}
              {connectedDevice?.id === item.id && isConnecting.error !== "" && (
                <Text style={{ color: "red" }}>{isConnecting.error}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
}
