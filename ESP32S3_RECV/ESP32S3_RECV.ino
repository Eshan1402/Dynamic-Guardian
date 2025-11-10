#include <Edge_device_inferencing.h>
#include <SPI.h>
#include <SD.h>

const int FEATURE_COUNT = 19;
float input_features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
float sensor_data[FEATURE_COUNT];

// === Mean & Scale Arrays ===
float scaler_mean[] = { 76.1575,
    53.039437919845454,
    15.094347531425928,
    0.23834384975291642,
    25.893451719010528,
    7.310511558173301,
    8.822768662437642,
    0.15564100228785885,
    910.9779166666667,
    21.082363742237902,
    70.60517054826651,
    58.75499883272878,
    3.8114677972559963,
    0.7571349509289703,
    45.500638997693834,
    -0.31297016328465893,
    31.365178372372167,
    17.112713037814263,
    95.00414321687441};
float scaler_scale[] = { 17.74465253956808,
    19.230161442678334,
    9.40115605128107,
    9.567886065617568,
    9.051270854052099,
    19.987927912836177,
    3.7180310058359316,
    28.511151760979565,
    652.2897821742987,
    2.0177891247885182,
    4.513631664393227,
    22.41454515702137,
    0.20095761739692888,
    2.288099783575291,
    10.20134992345848,
    1.4075099367302566,
    3.5470650153162353,
    8.030762815947117,
    1.7423903243286902 };

// === SD Card Settings ===
#define SD_CS_PIN 10          // adjust to your wiring (often 5, 10, or 13 on ESP32-S3)
File logFile;

unsigned long lastInference = 0;
unsigned long inferenceInterval = 3000;

// === Helper Functions ===
float scale_feature(float raw, int idx) {
  return (raw - scaler_mean[idx]) / scaler_scale[idx];
}

bool readSensorData() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) return false;

    int idx = 0;
    char *token = strtok((char*)line.c_str(), ",");
    while (token && idx < FEATURE_COUNT) {
      sensor_data[idx++] = atof(token);
      token = strtok(NULL, ",");
    }

    if (idx == FEATURE_COUNT) {
      // Log the raw data packet to SD card
      if (logFile) {
        logFile.print(millis());
        logFile.print(",");
        logFile.println(line);
        logFile.flush(); // ensure it's written
      }
      return true;
    }
  }
  return false;
}

void writeHeaderToSD() {
  logFile = SD.open("/log.csv", FILE_WRITE);
  if (logFile.size() == 0) {
    logFile.println("timestamp_ms,feature1,feature2,...,feature19,result_fatigue,result_stress,result_pothole,result_brake");
    logFile.flush();
  }
}

// === Setup ===
void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("=== Dynamic Guardian AI (ESP32-S3) ===");

  // === Initialize SD card ===
  if (!SD.begin(SD_CS_PIN)) {
    Serial.println("❌ SD Card initialization failed!");
  } else {
    Serial.println("✅ SD Card initialized successfully.");
    writeHeaderToSD();
  }

  Serial.println("Awaiting sensor data from Arduino Due...");
}

// === Loop ===
void loop() {
  if (millis() - lastInference < inferenceInterval) return;
  lastInference = millis();

  if (!readSensorData()) return;  // Wait until full packet received

  for (int i = 0; i < FEATURE_COUNT; i++)
    input_features[i] = scale_feature(sensor_data[i], i);

  signal_t signal;
  numpy::signal_from_buffer(input_features, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);

  ei_impulse_result_t result = {0};
  EI_IMPULSE_ERROR res = run_classifier(&signal, &result, false);

  if (res != EI_IMPULSE_OK) {
    Serial.printf("❌ Inference failed (error %d)\n", res);
    return;
  }

  Serial.println("\n📊 Real Sensor Snapshot:");
  for (int i = 0; i < FEATURE_COUNT; i++) {
    Serial.print(sensor_data[i]);
    Serial.print(i == FEATURE_COUNT - 1 ? '\n' : ',');
  }

  Serial.println("\n✅ Inference Results:");
  float fatigue = result.classification[0].value;
  float stress  = result.classification[1].value;
  float pothole = result.classification[2].value;
  float brake   = result.classification[3].value;

  Serial.printf("Fatigue: %.4f\n", fatigue);
  Serial.printf("Stress: %.4f\n", stress);
  Serial.printf("Pothole: %.4f\n", pothole);
  Serial.printf("Brake: %.4f\n", brake);

  // Explanation Layer
  if (fatigue > 0.8) Serial.println("⚠️ FATIGUE ALERT");
  if (stress  > 0.8) Serial.println("⚠️ STRESS ALERT");
  if (pothole > 0.8) Serial.println("⚠️ POTHOLE DETECTED");
  if (brake   > 0.8) Serial.println("⚠️ HARSH BRAKING DETECTED");

  Serial.println("-----------------------------");

  // === Log inference results to SD ===
  if (logFile) {
    logFile.print(millis());
    logFile.print(",");
    for (int i = 0; i < FEATURE_COUNT; i++) {
      logFile.print(sensor_data[i]);
      logFile.print(",");
    }
    logFile.print(fatigue, 4);
    logFile.print(",");
    logFile.print(stress, 4);
    logFile.print(",");
    logFile.print(pothole, 4);
    logFile.print(",");
    logFile.println(brake, 4);
    logFile.flush();
  }
}
