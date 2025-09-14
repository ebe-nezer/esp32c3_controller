#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// BLE Configuration
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcdefab-1234-5678-1234-abcdefabcdef"

const int CONT_PIN1 = 9;
const int CONT_PIN2 = 20;
const int POS_PIN = 10;

int NEUTRAL_US = 1500;
int DEADZONE_US = 8;
int FWD_RANGE_US = 400;
int REV_RANGE_US = 400;
float RESPONSE_EXP = 1.8;

int currentUS1 = NEUTRAL_US;
int currentUS2 = NEUTRAL_US;
int angle = 90;

const int MIN_ANGLE = 60;
const int MAX_ANGLE = 120;

Servo throttleServo;
Servo steeringServo;
Servo directionServo;

BLEServer *pServer = NULL;
BLECharacteristic *pWriteCharacteristic = NULL;
BLECharacteristic *pNotifyCharacteristic = NULL;
bool deviceConnected = false;

// Categories we want to handle dynamically
const char* categoryArr[] = {"throttle", "steering", "direction"};
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


// handler for throttle
void handleThrottle(int value) {
  if (value < 0) {
    int microseconds = map(abs(value), 0, 100, 0, 90);
    throttleServo.writeMicroseconds(microseconds);
    Serial.print("Throttle set to: ");
    Serial.println(value);
    // Reverse
  } else if (value > 0) {
    // Forward
    int microseconds = map(value, 0, 100, 90, 180);
    throttleServo.writeMicroseconds(microseconds);
    Serial.print("Throttle set to: ");
    Serial.println(value);
  } else {
    // Stop
    throttleServo.writeMicroseconds(90); // Neutral position
    Serial.println("Throttle set to: 0 (Neutral)");
  }
}

// handler for steering
void handleSteering(int value) {
  int microseconds = map(value, -100, 100, 0, 180);
  steeringServo.writeMicroseconds(microseconds); // Map -100 to 100 to 0 to 180S
  Serial.print("Steering set to: ");
  Serial.println(value);
}

// handler for direction
void handleDirection(int value) {
  int microseconds = map(value, -100, 100, 0, 180);
  directionServo.writeMicroseconds(microseconds); // Map -100 to 100 to 0 to 180
  Serial.print("Direction set to: ");
  Serial.println(value);
}

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

    // Allocate PWM timers
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  // Attach servos to specific pins
  throttleServo.attach(9, 1000, 2000); // GPIO 9
  steeringServo.attach(10, 1000, 2000); // GPIO 10
  directionServo.attach(11, 1000, 2000); // GPIO 11

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
  delay(10);
}
