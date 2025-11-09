🚗 Dynamic Guardian

i.Mobilothon 5.0 Submission | AI-Enhanced Driver Wellness Monitoring

<div align="center">

</div>

The Dynamic Guardian represents a fundamental shift in vehicle technology. It is not a passive "telematics tracker", but an active, intelligent co-pilot that functions as an AI-powered, real-time safety system living inside the vehicle.

The system's mission is to create a 360-degree "guardian bubble" by performing Contextual Fusion—the AI's ability to combine multiple, seemingly unrelated data streams to understand the full context of a situation. This is all achieved through an edge-first philosophy, where all critical AI inference and decisions happen locally on an STM-based module for millisecond-level intervention.

This repository contains the complete project, including all embedded code, AI model data, and front-end dashboard code. The code is organized by its function—you can find the specific implementation details within each folder.

✨ Core Concept: The Four Pillars of Data Fusion

Dynamic Guardian's "Contextual Fusion AI" works by integrating data from four key pillars to build a complete understanding of the driver and vehicle:

Driver Biological State (Wearable/Sensor Data)

HEART_RATE_ECG: Measures acute stress or panic.

HEART_RATE_VARIABILITY_HRV: The key indicator of cognitive load and fatigue.

Driver Behaviour (CAN Bus Data)

STEERING_WHEEL_ANGLE: Detects erratic corrections common in fatigue.

ACCELERATOR_PEDAL_POSITION: Monitors for inefficient "feathering" (range anxiety).

BRAKE_PEDAL_PRESSURE: Identifies "panic slam" events.

Cabin Environment (Cabin Sensor Data)

CO2_PPM: Identifies a primary hidden cause of drowsiness.

CABIN_TEMPERATURE_C: Tracks comfort metrics that contribute to agitation.

AMBIENT_NOISE_DB_AVG: Monitors for external stressors.

Vehicle Health & Context (Telemetry & BMS Data)

SOC_PCT (State of Charge): The critical input for range anxiety models.

ACCELEROMETER_Z/Y: Detects potholes and harsh braking forces.

⚙️ System Architecture

The system operates on a three-stage process flow for ultra-low-latency, proactive safety:

Data Acquisition (Sensors & Vehicle)

Gathers real-time data from vehicle CAN Bus (Telemetry/BMS), environmental sensors (CO2/Noise), GPS, and a driver-facing camera (for fatigue).

Edge AI Processing (STM32 + Edge Impulse)

All raw data streams are fed into an STM32 Microcontroller running Edge Impulse TFLite models.

A Contextual Fusion & Decision Engine (C++) analyzes the AI model outputs (e.g., FATIGUE_ALERT, STRESS_ALERT) to make real-time decisions.

Cloud & Action (AWS IoT)

An ESP32 Co-processor sends small, critical alerts and summary data via MQTT to AWS IoT Core.

This triggers Amazon SNS for instant alerts (SMS/911) and logs data in Amazon DynamoDB for the fleet manager dashboard.

🛠️ Technology Stack

This solution uses a combination of high-performance embedded hardware, edge AI, and cloud technologies.

Production Edge Hardware: High-performance ESP32-S3 (listed as STM32H7 + ESP32-S3 in roadmap)

Connectivity Co-Processor: ESP32-S3 (for Wi-Fi, BLE, and cloud communication)

Prototyping & Data Logging: Arduino Due (chosen for native CAN bus support to capture real-world data)

AI & Firmware: TensorFlow Lite Micro / Edge Impulse (for on-device model inference), FreeRTOS (for real-time task management)

Sensor Suite: ECG/PPG (Heart Rate, HRV), Dual CAN Transceivers, $CO_{2}$ & Temperature sensors, MEMS microphone, High-Speed IMU (Accelerometer)

Cloud Backend: AWS IoT Core, Amazon SNS, Amazon DynamoDB

User Interface: Web-based dashboard (HTML/CSS/JS)

📁 Repository Structure

Dynamic-Guardian/
├── embedded/           # STM32H7 and ESP32-S3 firmware (C++/FreeRTOS)
├── ai_model/           # Edge Impulse / TFLite model files and training data
├── dashboard/          # The front-end fleet management dashboard (HTML/CSS/JS)
├── data_logging/       # Arduino Due scripts for CAN bus data capture
└── README.md


📊 Fleet Management Dashboard

The /dashboard directory contains a classy, responsive front-end dashboard for real-time vehicle monitoring. This UI is built with pure HTML/CSS/JS and features:

Real-time Gauges: Power, Torque, RPM, Speed, SOC, and Coolant Temp.

Battery Management System: Live charts for pack voltage, current, temp, and cell delta.

CAN Bus Integration: A live, filterable stream of CAN messages.

Diagnostics: Display and clearing of Diagnostic Trouble Codes (DTCs).

Predictive Safety Module: Fuses telematics & BMS data for live risk scoring and emergency alerts.

UI/UX: Automotive-inspired dark theme with glassmorphism and smooth animations.

L Project Links

GitHub Repository: https://github.com/Eshan1402/Dynamic-Guardian

Project Demo Video: View on Google Drive

Live Website: The live website link is available in the "About" section of the GitHub repository.

👤 Team

Team Name: Decryptors

Team Leader: chaitanya srivastava

Contributors: Eshan Saxena (Dashboard UI & Repo Host)

<div align="center">

⭐ Star this repo if you find it useful!

Made with ❤️ for proactive vehicle safety.

</div>
