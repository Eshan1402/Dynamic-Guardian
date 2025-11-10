🚗 Dynamic Guardian – AI-Driven Vehicle Health & Driver Monitoring
I have attached three hardware code files each on perform according to there name Arduino duo for CAN data recv and ESP32 for serial communcation and performing ML opration on the edge and One more file where i have used some dummy data and dummy situation for testing our model over there i have attached all the code firebase api key so it will give proper output 

🚀 Interactive Showcase

Check out a live, interactive demo of the project's architecture, dashboard, and setup.

➡️ Click here for the Live Interactive Demo!


UI Demo

Here is a quick walkthrough of the interactive showcase app:


🧠 System Overview

The system functions as a smart edge AI guardian inside a vehicle. It operates on a two-board architecture:

Sensor Hub (Arduino): A dedicated Arduino board gathers and preprocesses live data streams from all connected sensors (heart rate, accelerometer, CO₂, braking pressure, etc.).

Main Controller (ESP32-S3): The ESP32 receives this data via serial communication. It then applies an Edge Impulse machine learning model to detect:

Driver Fatigue

Driver Stress

Pothole / Road Condition

Harsh or Late Braking

Results are instantly displayed on the ESP32's AMOLED dashboard and periodically uploaded to Firebase Realtime Database for remote monitoring and analytics.

⚙️ Hardware & Software Requirements

🧩 Hardware

Main Controller: LilyGo T-Display-S3 (ESP32-S3 with AMOLED display)

Sensor Hub: An Arduino board (e.g., Arduino Uno, Nano, or Mega)

Sensors (Connected to Arduino):

Heart rate / ECG sensor

CO₂ / Air quality sensor

Accelerometer / Gyroscope (e.g., MPU6050)

Brake pressure sensor (or potentiometer)

Connection: Logic level shifter (if using 5V Arduino with 3.3V ESP32)

💻 Software

Arduino IDE 2.x (or PlatformIO)

ESP32 Libraries:

LilyGo_AMOLED

LV_Helper

Firebase_ESP_Client

#include <Edge_device_inferencing.h> (from Edge Impulse)

WiFi.h

Arduino Libraries:

SoftwareSerial.h (if needed)

Specific libraries for your sensors (e.g., Adafruit_MPU6050, PulseSensor_Amped, etc.)

🧠 System Architecture & Data Flow

The system is split into two main components to ensure stable sensor readings and powerful processing.

graph TD
    A[Sensors (HR, Accel, CO2)] --> B(Arduino - Transmitter);
    B -- Serial/UART --> C(ESP32-S3 - Receiver);
    C --> D[Data Window & Scaling];
    D --> E(Edge Impulse Classifier);
    E --> F[LVGL Dashboard (Local)];
    E --> G[Firebase DB (Cloud)];


(This diagram shows the flow from sensors to the Arduino, then to the ESP32 which runs the ML model and sends results to the dashboard and cloud.)

🧩 Code Features

🔹 Two-Board Architecture
The Arduino acts as a dedicated sensor hub, handling the task of reading from multiple sensors. It formats this data into a single, clean string and transmits it via UART to the ESP32-S3. This offloads the ESP32, allowing it to focus on ML, UI, and Wi-Fi.

🔹 Serial Data Reception
The ESP32 continuously listens for incoming serial data from the Arduino. It parses this string to extract the individual sensor values, which are then fed into a rolling 5-second window to smooth out variations.

🔹 Machine Learning Inference
The average of the latest data window is passed into an Edge Impulse classifier (run_classifier()), returning prediction scores for fatigue, stress, pothole detection, and harsh braking.

🔹 Heuristic Fine-Tuning
The raw ML results are adjusted based on sensor context—e.g., high CO₂ or low HRV increases fatigue probability.

🔹 Dynamic Dashboard (LVGL UI)
The dashboard includes:

Bars for fatigue and stress levels

Line chart showing braking and pothole trends

Status indicators summarizing the current condition

🔹 Cloud Sync (Firebase)
Every 5 seconds, the system sends summarized data to Firebase Realtime Database, including average sensor values, classification states, and system health.

🧾 Inference Categories

Label Index

Category

Typical Meaning

Display Behavior

0

Fatigue

Drowsiness or low alertness

“Fatigue: Drowsy”

1

Stress

High heart rate or erratic behavior

“Stress: High”

2

Pothole / Road

Rough terrain or vibration detected

“Road: Poor Condition”

3

Harsh Braking

Rapid deceleration or sudden stop

“Braking: Late Braking”

🔧 Configuration & Setup

1. Arduino Transmitter

Connect all your sensors (MPU6050, Heart Rate, CO2, etc.) to the Arduino.

In the Arduino_Transmitter.ino code, implement the logic to read from each sensor.

Combine all readings into a single comma-separated string (or other format) and send it over the Serial port.

Example: Serial.println(String(hr) + "," + String(hrv) + "," + String(co2) + "," + String(accelZ));

Upload this code to your Arduino.

2. ESP32-S3 Receiver

Connect the TX pin of the Arduino to the RX pin of the ESP32-S3 (e.g., Serial2 RX pin). Connect their GND pins.

Voltage Warning: If your Arduino is 5V (like an Uno) and the ESP32 is 3.3V, you must use a logic level shifter on the TX->RX line to avoid damaging the ESP32.

In the ESP32 code, update your network credentials:

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"


Update your Firebase credentials:

#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "[https://your-project-id-default-rtdb.firebaseio.com/](https://your-project-id-default-rtdb.firebaseio.com/)"


Ensure your Firebase Realtime Database rules allow authenticated writes.

Upload the complete code (which includes serial reception, ML, LVGL, and Firebase) to the ESP32-S3.

🧩 Key Parameters

Parameter

Description

Default

NUM_FEATURES

Number of features per data sample

19

SAMPLE_INTERVAL_MS

Interval between each reading (on ESP32)

500 ms

WINDOW_SIZE

Number of readings per inference window

10

SERIAL_UPDATE_INTERVAL

How often results are printed to Serial

5 seconds

DISPLAY_UPDATE_INTERVAL

Dashboard refresh interval

10 seconds

inferenceInterval

Time between Edge Impulse inferences

Adaptive

🖥️ LVGL Dashboard Layout

UI Element

Description

Fatigue Bar

Displays fatigue score (0–100%)

Stress Bar

Displays stress score (0–100%)

Line Chart

Plots braking and pothole levels

Status Labels

Summarize latest conditions and alerts

🔍 Firebase Realtime Data Format

Path: /guardianReport/latest

Example JSON:

{
  "avgAccelZ": 3.5,
  "avgBrakePressure": 25.1,
  "avgCO2": 820.3,
  "avgHRV": 28.9,
  "avgHeartRate": 88.2,
  "braking": "Normal",
  "fatigue": "Normal",
  "overall": "All systems normal.",
  "road": "Smooth",
  "stress": "Normal",
  "samplingRateMs": 500,
  "sendingLatencyMs": 128
}


🔒 Safety Logic (Explanation Layer)

Condition

Trigger

Action

Fatigue > 0.8

High drowsiness

Show “⚠️ Fatigue Alert”

Stress > 0.7

High stress response

Show “⚠️ Stress Alert”

Pothole > 0.6

Uneven road

Warn driver

Braking > 0.6

Sudden deceleration

Mark as harsh braking

📊 Serial Console Output Example (from ESP32)

=============================
Avg HR
