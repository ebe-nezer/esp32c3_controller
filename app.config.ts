import { ConfigContext, ExpoConfig } from "@expo/config";
import { version } from "./package.json";

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.NODE_ENV === "preview";
const EAS_PROJECT_ID = "1bc4d138-87d8-40c0-a66e-5ca99bc89e7c";
const SCHEME = "rnble";
const ICON = "./assets/ios-dark.png";
const ADAPTIVE_ICON = "./assets/adaptive-icon.png";

const ENV = process.env["EXPO_PUBLIC_APP_ENV"] as
  | "development"
  | "preview"
  | "production"
  | undefined;

const appName = "RN BLE";

const getAppName = () => {
  if (isProduction) return `${appName} - Production`;
  if (isPreview) return `${appName} - Preview`;
  return `${appName} - Development`;
};

const getPackageName = () => {
  if (isProduction) return "com.aptivedge.rnble";
  if (isPreview) return "com.aptivedge.rnble.preview";
  return "com.aptivedge.rnble.dev";
};

export default ({ config }: ConfigContext): ExpoConfig => {
  console.log("⚙️ Building app for environment:", ENV);

  return {
    ...config,
    name: getAppName(),
    slug: "rn-ble",
    scheme: SCHEME,
    version: version,
    orientation: "default",
    icon: ICON,
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon-dark.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    primaryColor: "#6200ee",
    updates: {
      fallbackToCacheTimeout: 0,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      enabled: true,
      checkAutomatically: "ON_LOAD",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getPackageName(),
      splash: {
        image: ICON,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
      buildNumber: version,
      infoPlist: {
        NSBluetoothAlwaysUsageDescription:
          "This app uses Bluetooth to connect to external devices.",
        NSLocationWhenInUseUsageDescription:
          "This app uses your location to scan for Bluetooth devices.",
      },
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    platforms: ["ios", "android"],
    newArchEnabled: true,
    android: {
      softwareKeyboardLayoutMode: "pan",
      edgeToEdgeEnabled: true,
      package: getPackageName(),
      backgroundColor: "#FFFFFF",
      permissions: [
        "BLUETOOTH_SCAN",
        "BLUETOOTH_CONNECT",
        "BLUETOOTH_ADVERTISE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
      ],
      adaptiveIcon: {
        foregroundImage: ADAPTIVE_ICON,
        backgroundColor: "#FFFFFF",
      },
      splash: {
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
          image: ICON,
          resizeMode: "contain",
        },
        resizeMode: "contain",
      },
    },
    web: {
      bundler: "metro",
      favicon: "./assets/ios-dark.png",
    },
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-splash-screen",
      "expo-updates",
      "expo-secure-store",
      [
        "expo-dev-client",
        {
          launchMode: "most-recent",
        },
      ],
      [
        "expo-screen-orientation",
        {
          initialOrientation: "DEFAULT",
        },
      ],
      [
        "react-native-ble-plx",
        {
          isBackgroundEnabled: true,
          modes: ["peripheral", "central"],
          bluetoothAlwaysPermission:
            "Allow $(PRODUCT_NAME) to connect to bluetooth devices",
        },
      ],
    ],
  };
};
