import { BleManager, Device } from "react-native-ble-plx";
import EventEmitter from "eventemitter3";
import { PermissionsAndroid, Platform } from "react-native";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { requestBluetoothPermissions } from "./bluetooth";

// Base BLE Service with common logic
abstract class BaseBLEService extends EventEmitter {
  protected bleManager: BleManager;

  constructor() {
    super();
    this.bleManager = new BleManager();
  }

  abstract startScan(): void;
  abstract stopScan(): void;
  abstract connectToDevice(deviceId: string): Promise<Device>;
  abstract disconnectFromDevice(deviceId: string): Promise<void>;
}

// ESP32C3-specific implementation
class ESP32C3BLEService extends BaseBLEService {
  private connectedDevice: Device | null = null;
  private manager = this.bleManager;

  async startScan(): Promise<void> {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      this.emit("error", new Error("Bluetooth/Location permission denied"));
      return;
    }
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        this.emit("error", error);
        return;
      }
      if (device) {
        this.emit("deviceFound", device);
      }
    });
  }

  async disconnectFromDevice(deviceId: string): Promise<void> {
    try {
      await this.manager.cancelDeviceConnection(deviceId);
      if (this.connectedDevice && this.connectedDevice.id === deviceId) {
        this.emit("disconnected", this.connectedDevice);
        this.connectedDevice = null;
      }
    } catch (e) {
      this.emit("error", e);
      throw e;
    }
  }
  private static instance: ESP32C3BLEService;

  private constructor() {
    super();
  }

  public static getInstance(): ESP32C3BLEService {
    if (!ESP32C3BLEService.instance) {
      ESP32C3BLEService.instance = new ESP32C3BLEService();
    }
    return ESP32C3BLEService.instance;
  }

  public async scanDevices() {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      this.emit("error", new Error("Bluetooth/Location permission denied"));
      return;
    }
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        this.emit("error", error);
        return;
      }
      if (device) {
        this.emit("deviceFound", device);
      }
    });
  }

  public stopScan() {
    this.manager.stopDeviceScan();
  }

  public async connectToDevice(deviceId: string): Promise<Device> {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      this.emit("error", new Error("Bluetooth/Location permission denied"));
      throw new Error("Bluetooth/Location permission denied");
    }
    try {
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      this.emit("connected", device);
      return device;
    } catch (e) {
      this.emit("error", e);
      throw e;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      this.emit("disconnected", this.connectedDevice);
      this.connectedDevice = null;
    }
  }

  public async writeData({
    charUUID,
    data,
    serviceUUID,
  }: {
    serviceUUID: string;
    charUUID: string;
    data: string;
  }): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    await this.connectedDevice.writeCharacteristicWithResponseForService(
      serviceUUID,
      charUUID,
      Buffer.from(data, "utf-8").toString("base64")
    );
  }
}

// Factory
export class BLEServiceFactory {
  static createService(
    type: "ESP32C3" | "OtherDevice" = "ESP32C3"
  ): BaseBLEService {
    switch (type) {
      case "ESP32C3":
        return ESP32C3BLEService.getInstance();
      default:
        throw new Error(`Unknown BLE service type: ${type}`);
    }
  }
}
