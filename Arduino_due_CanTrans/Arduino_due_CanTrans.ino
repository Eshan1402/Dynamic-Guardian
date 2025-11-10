#include <due_can.h>

void setup() {
  Serial.begin(115200);    // To ESP32-S3
  Can0.begin(CAN_BPS_500K);  
  Serial.println("CAN to Serial Bridge (Arduino Due) started");
}

void loop() {
  CAN_FRAME frame;
  float heartRate = 0, hrv = 0, hr_std = 0, steering = 0, accel = 0;
  float brake = 0, steer_std = 0, brake_delta = 0, co2 = 0, cabin_temp = 0;
  float noise = 0, soc = 0, cell_volt = 0, acc_z = 0, speed = 0, acc_y = 0;
  float cell_temp = 0, module_current = 0, soh = 0;

  if (Can0.available()) {
    Can0.read(frame);

    switch (frame.id) {
      case 0x100:  // Engine vitals
        heartRate = frame.data.byte[0];
        hrv = frame.data.byte[1];
        hr_std = frame.data.byte[2];
        break;

      case 0x200:  // Steering & pedal
        steering = (int8_t)frame.data.byte[0];
        accel = frame.data.byte[1];
        brake = frame.data.byte[2];
        break;

      case 0x300:  // Environmental
        co2 = (frame.data.byte[0] * 10);
        cabin_temp = frame.data.byte[1];
        noise = frame.data.byte[2];
        break;

      case 0x400:  // Battery system
        soc = frame.data.byte[0];
        cell_volt = frame.data.byte[1] / 100.0;
        cell_temp = frame.data.byte[2];
        module_current = frame.data.byte[3];
        soh = frame.data.byte[4];
        break;

      case 0x500:  // Motion sensors
        acc_y = ((int8_t)frame.data.byte[0]) / 10.0;
        acc_z = ((int8_t)frame.data.byte[1]) / 10.0;
        speed = frame.data.byte[2];
        break;
    }
  }

  // Combine and send all features as CSV
  Serial.print(heartRate); Serial.print(",");
  Serial.print(hrv); Serial.print(",");
  Serial.print(hr_std); Serial.print(",");
  Serial.print(steering); Serial.print(",");
  Serial.print(accel); Serial.print(",");
  Serial.print(brake); Serial.print(",");
  Serial.print(steer_std); Serial.print(",");
  Serial.print(brake_delta); Serial.print(",");
  Serial.print(co2); Serial.print(",");
  Serial.print(cabin_temp); Serial.print(",");
  Serial.print(noise); Serial.print(",");
  Serial.print(soc); Serial.print(",");
  Serial.print(cell_volt); Serial.print(",");
  Serial.print(acc_z); Serial.print(",");
  Serial.print(speed); Serial.print(",");
  Serial.print(acc_y); Serial.print(",");
  Serial.print(cell_temp); Serial.print(",");
  Serial.print(module_current); Serial.print(",");
  Serial.println(soh);

  delay(3000);  // Match inference interval
}

