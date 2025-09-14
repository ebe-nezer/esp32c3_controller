#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <ArduinoJson.h>

// BLE Configuration
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcdefab-1234-5678-1234-abcdefabcdef"

BLEServer *pServer = NULL;
BLECharacteristic *pWriteCharacteristic = NULL;
BLECharacteristic *pNotifyCharacteristic = NULL;
bool deviceConnected = false;

// Categories we want to handle dynamically
const char* categoryArr[] = {"throttle", "steering", "aux1", "aux2"};
const int categoryCount = sizeof(categoryArr) / sizeof(categoryArr[0]);

// BLE Server Callbacks
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Client connected.");
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Client disconnected.");
    pServer->startAdvertising();
  }
};

// Handle incoming JSON data
void handleJson(const String& json) {
  StaticJsonDocument<256> doc;  // adjust size if more keys
  DeserializationError error = deserializeJson(doc, json);

  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Loop through all categories
  for (int i = 0; i < categoryCount; i++) {
    const char* key = categoryArr[i];
    if (doc.containsKey(key)) {
      int value = doc[key];
      Serial.print(key);
      Serial.print(" = ");
      Serial.println(value);

      // TODO: Replace with real motor/servo logic
    }
  }
}

// Write Characteristic Callback
class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue().c_str();

    Serial.print("Received: ");
    Serial.println(value);

    handleJson(value);

    // Echo back as notification
    if (deviceConnected && pNotifyCharacteristic) {
      String notifyPayload = "{\"uuid\":\"demo-uuid\",\"value\":" + value + "}";
      pNotifyCharacteristic->setValue(notifyPayload.c_str());
      pNotifyCharacteristic->notify();
      Serial.println("Notified back to client.");
    }
  }
};

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("Initializing BLE...");
  BLEDevice::init("ESP32C3_Controller");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Write characteristic (client -> server)
  pWriteCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pWriteCharacteristic->setCallbacks(new MyCallbacks());

  // Notify characteristic (server -> client)
  pNotifyCharacteristic = pService->createCharacteristic(
    "fedcba98-4321-4321-4321-abcdefabcdef",
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pService->start();
  pServer->getAdvertising()->start();

  Serial.println("BLE Ready. Waiting for connection...");
}

void loop() {
  // Optionally send keepalive every 500ms
  if (deviceConnected && pNotifyCharacteristic) {
    pNotifyCharacteristic->setValue("{\"uuid\":\"keepalive\",\"value\":\"ping\"}");
    pNotifyCharacteristic->notify();
  }
  delay(500);
}
