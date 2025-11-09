# 🚗 Vehicle Telemetry Dashboard

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

A **classy, responsive front-end dashboard** for real-time vehicle monitoring. Track power, torque, battery health, diagnostics, and CAN bus frames with elegant visualizations.

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Integration](#-integration) • [Screenshots](#-screenshots)

</div>

---

## ✨ Features

### 📊 **Real-time Gauges**
- **Power & Torque** — Live powertrain metrics
- **RPM & Speed** — Engine and vehicle velocity tracking
- **Battery State of Charge** — SOC monitoring
- **Coolant Temperature** — Engine thermal status

### 🔋 **Battery Management System**
- **Pack Metrics** — Voltage, current, temperature, cell delta
- **Live Chart** — Multi-series telemetry graph (voltage, current, temp, SOC)
- **Health Monitoring** — Real-time battery pack diagnostics

### 🔌 **CAN Bus Integration**
- **Live Frame Stream** — Real-time CAN message monitoring
- **Filterable Table** — Search by CAN ID (e.g., `0x123`)
- **Streaming Toggle** — Start/stop frame capture

### 🔧 **Diagnostics**
- **DTC Codes** — Diagnostic Trouble Code display
- **Severity Indicators** — Color-coded issue levels
- **Clear Codes** — Reset diagnostic history

### 🎨 **UI/UX**
- **Dark Theme** — Automotive-inspired glassmorphism design
- **Smooth Animations** — Cursor tracking and hover effects
- **Responsive Layout** — Works on desktop and tablets
- **No Build Step** — Pure HTML/CSS/JS, open and run

### 🛡️ **Predictive Safety**
- **ML-Inspired Risk Analysis** — Fuses telematics & BMS data for live scoring
- **Emergency Actions** — One-tap alerts for emergency services and family
- **Explore More Modal** — Deep dive card with driver portrait, battery analytics, and safeguard checklist
- **Driver & Thermal Insights** — Highlights driver strain and pack thermal state

---

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- No additional dependencies or build tools required

### Installation

```bash
# Clone the repository
git clone https://github.com/Eshan1402/Dynamic-Guardian.git

# Navigate to the project directory
cd Dynamic-Guardian

# Open in your browser
open index.html
# Or simply double-click index.html
```

That's it! The dashboard runs entirely client-side.

---

## 📖 Usage

### **Viewing Gauges**
- All gauges update automatically with simulated telemetry
- Values display both in the gauge and as numeric labels below

### **Battery Management**
- Monitor pack voltage, current, temperature, and cell delta
- View trends in the live chart (updates every ~120ms)

### **CAN Bus Monitoring**
1. Click **"Connect CAN"** to start streaming frames
2. Use the **filter input** to search by CAN ID (e.g., `0x1A`)
3. Toggle the **Stream** checkbox to pause/resume

### **Diagnostics**
- View active DTC codes with severity levels
- Click **"Clear Codes"** to reset the diagnostic list

### **Get Information**
- Click **"Get Information"** to refresh all telemetry values

### **Predictive Safety**
- View live risk status (Stable, Caution, Critical)
- Trigger emergency or family alerts with prefilled context
- Click **"Explore More"** for driver snapshot, battery stats, and recommended safety measures

---

## 🔌 Integration

### **Connecting Real CAN Hardware**

Replace the simulated data in `app.js` with your CAN adapter:

#### **Option 1: WebSerial API (Recommended)**
```javascript
// Connect to serial CAN adapter
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 115200 });
const reader = port.readable.getReader();

// Read CAN frames
while (true) {
  const { value } = await reader.read();
  // Parse CAN frame and update gauges
  updateGauge('power', value.power);
  emitCanFrame(value.canId, value.data);
}
```

#### **Option 2: Backend API**
```javascript
// Fetch from your backend
async function fetchTelemetry() {
  const res = await fetch('/api/telemetry');
  const data = await res.json();
  updateGauge('power', data.power);
  updateGauge('torque', data.torque);
  // ... update other gauges
}
setInterval(fetchTelemetry, 100);
```

#### **Option 3: WebSocket**
```javascript
const ws = new WebSocket('ws://your-can-bridge:8080');
ws.onmessage = (e) => {
  const frame = JSON.parse(e.data);
  emitCanFrame(frame.id, frame.data);
  updateGauge('rpm', frame.rpm);
};
```

### **Supported CAN Adapters**
- **CANable** (USB-CAN adapter)
- **MCP2515** (Arduino/CAN shield)
- **PCAN-USB** (Peak System)
- Any adapter that outputs CAN frames via serial/WebSocket/API

---

## 📸 Screenshots

<div align="center">

### Dashboard Overview
![Dashboard](https://via.placeholder.com/800x400/0b0f17/e5e7eb?text=Vehicle+Telemetry+Dashboard)

### Gauges & Metrics
![Gauges](https://via.placeholder.com/800x400/0b0f17/e5e7eb?text=Live+Gauges+%26+Metrics)

### CAN Bus Monitor
![CAN Bus](https://via.placeholder.com/800x400/0b0f17/e5e7eb?text=CAN+Bus+Frame+Stream)

### Battery Management
![BMS](https://via.placeholder.com/800x400/0b0f17/e5e7eb?text=Battery+Management+System)

</div>

*Add your screenshots to the repository and update these placeholders*

---

## 📁 Project Structure

```
Dynamic-Guardian/
├── index.html          # Main HTML structure
├── styles.css          # Dark theme & component styles
├── app.js             # Gauges, telemetry, CAN bus logic
└── README.md          # This file
```

---

## 🛠️ Customization

### **Modifying Gauge Ranges**
Edit `app.js`:
```javascript
const gauges = {
  power: createGauge('gauge-power', { 
    min: 0, 
    max: 350,  // Adjust max value
    colorClass: 'power' 
  }),
  // ... other gauges
};
```

### **Changing Colors**
Edit `styles.css`:
```css
:root {
  --primary: #3b82f6;    /* Blue */
  --accent: #22d3ee;     /* Cyan */
  --success: #10b981;    /* Green */
  /* ... customize colors */
}
```

### **Adjusting Update Frequency**
Edit `app.js`:
```javascript
let telemetryInterval = setInterval(simulateTelemetry, 120); // Change 120ms
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Eshan Saxena**

- GitHub: [@Eshan1402](https://github.com/Eshan1402)
- Repository: [Dynamic-Guardian](https://github.com/Eshan1402/Dynamic-Guardian)

---

## 🙏 Acknowledgments

- Built with vanilla JavaScript (no frameworks)
- Inspired by modern automotive dashboards
- SVG-based gauges for crisp rendering

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ for vehicle monitoring enthusiasts

</div>
