// === Firebase SDK Imports ===
// These are now at the top, outside the IIFE,
// because index.html will load them as a module.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


(() => {
  const overlay = document.getElementById("safety-modal");
  if (!overlay) return;

  const closeBtn = document.getElementById("safety-modal-close");
  const exploreBtn = document.getElementById("btn-explore-safety");

  const els = {
    driverLoad: document.getElementById("modal-driver-load"),
    maneuvers: document.getElementById("modal-maneuvers"),
    fatigue: document.getElementById("modal-fatigue"),
    packVoltage: document.getElementById("modal-pack-voltage"),
    packCurrent: document.getElementById("modal-pack-current"),
    cellDelta: document.getElementById("modal-cell-delta"),
    thermalBand: document.getElementById("modal-thermal-band"),
    safeguards: document.getElementById("modal-safeguards"),
    recommendations: document.getElementById("modal-recommendations"),
    emergency: document.getElementById("modal-emergency"),
    photo: document.getElementById("driver-photo"),
  };

  // Defaults for data coming from app.js simulation
  const defaults = {
    driverLoad: "Low",
    telemetry: { speed: 0, torque: 0, coolant: 0 },
    bms: { voltage: 360, current: 0, delta: 8, temp: 28, soc: 70 },
    safety: {
      status: "Stable",
      score: 0,
      desc: "Model indicates nominal driving pattern.",
      telemetryMessage: "All systems green",
    },
  };
  
  // Defaults for data coming from Firebase
  const guardianDefaults = {
    avgHeartRate: 0.0,
    avgHRV: 0.0,
    avgCO2: 0.0,
    avgBrakePressure: 0.0,
    avgAccelZ: 0.0,
    fatigue: "Loading...",
    stress: "Loading...",
    road: "Loading...",
    braking: "Loading...",
    overall: "Waiting for data..."
  };

  // This holds data from the app.js simulation
  let latest = null; 
  // This will hold the new data from Firebase
  let latestGuardianReport = null;

  // === THIS WAS THE MISSING FUNCTION ===
  function setText(target, value) {
    if (target) target.textContent = value;
  }
  // ======================================

  // === NEW: Firebase Initialization ===
  const firebaseConfig = {
    apiKey: "AIzaSyAuNrkjHb5_GbGdEQqarokhSxxZz-IL51c",
    authDomain: "edgedevice.firebaseapp.com",
    databaseURL: "https://edgedevice-default-rtdb.firebaseio.com/",
    projectId: "edgedevice",
    storageBucket: "edgedevice.firebasestorage.app",
    messagingSenderId: "379840080249",
    appId: "1:379840080249:web:c6cf422c177c3a31f827a8",
    measurementId: "G-3C7Q9J8L3D"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  
  // ***IMPORTANT***: I've chosen the path 'guardianReport/latest'.
  // You must make sure your device/sender writes the
  // report object to this *exact* path in Firebase.
  const guardianReportRef = ref(db, 'guardianReport/latest');

  // === UI Rendering Logic (MODIFIED) ===
  // Render now reads from *two* different state variables
  function render() {
    // 1. Data from app.js simulation (for bottom part of modal)
    const detail = latest || defaults;
    const { driverLoad, telemetry, bms, safety } = detail;

    // This line (explore.js:88) was causing the error, it will now work
    setText(els.driverLoad, driverLoad || defaults.driverLoad);

    const speed = telemetry?.speed ?? defaults.telemetry.speed;
    const torque = telemetry?.torque ?? defaults.telemetry.torque;
    const coolant = telemetry?.coolant ?? defaults.telemetry.coolant;

    const maneuverHint =
      speed > 120 || torque > 450
        ? "Aggressive"
        : speed > 80
        ? "Dynamic"
        : "Calm";
    setText(els.maneuvers, maneuverHint);

    const fatigueEstimate =
      safety?.score > 1.1 ? "High" : safety?.score > 0.6 ? "Moderate" : "Fresh";
    setText(els.fatigue, fatigueEstimate);

    const voltage = bms?.voltage ?? defaults.bms.voltage;
    const current = bms?.current ?? defaults.bms.current;
    const delta = bms?.delta ?? defaults.bDms.delta; // Corrected typo here too (was bDms.delta)
    const temp = bms?.temp ?? defaults.bms.temp;

    setText(els.packVoltage, `${Math.round(voltage)} V`);
    setText(els.packCurrent, `${Math.round(current)} A`);
    setText(els.cellDelta, `${Math.round(delta)} mV`);
    const thermalBand =
      temp > 50 || coolant > 95
        ? "High"
        : temp > 40 || coolant > 85
        ? "Elevated"
        : "Nominal";
    setText(els.thermalBand, thermalBand);

    const riskScore = safety?.score ?? defaults.safety.score;
    const safeguards =
      riskScore > 1.1
        ? "Adaptive braking & traction control actively primed."
        : "Automatic cruise modulation ready if surge detected.";
    setText(els.safeguards, safeguards);

    const recommendations =
      riskScore > 0.6
        ? "Reduce speed, schedule pack cooling, and check tire pressure."
        : "Maintain steady speed; monitor coolant temps on long climbs.";
    setText(els.recommendations, recommendations);

    const emergency =
      riskScore > 1.1
        ? "Emergency contacts dialing protocol armed; med kit status verified."
        : "Emergency contacts synced; seatbelt tensioners pre-armed.";
    setText(els.emergency, emergency);

    if (els.photo) {
      els.photo.src =
        riskScore > 0.6
          ? "https://via.placeholder.com/96x96.png?text=Driver+Alert"
          : "https://via.placeholder.com/96x96.png?text=Driver";
    }

    // === MODIFIED SECTION: LATEST INFORMATION CARD ===
    // 2. Data from Firebase (for top card)
    const report = latestGuardianReport || guardianDefaults;
    
    const content = overlay.querySelector(".modal-content");
    if (!content) return;

    // Ensure scrollable modal
    content.style.maxHeight = "85vh";
    content.style.overflowY = "auto";
    content.style.padding = "16px";



    // Remove existing card before re-rendering
    const oldCard = document.getElementById("latest-info-card");
    if (oldCard) oldCard.remove();

    // Create new card and insert at the top
    const card = document.createElement("div");
    card.id = "latest-info-card";
    card.style.background = "#0b0b0c";
    card.style.border = "1px solid #2a2a2a";
    card.style.borderRadius = "12px";
    card.style.padding = "16px";
    card.style.color = "#d4d4d4";
    card.style.fontFamily = "monospace";
    card.style.marginBottom = "20px";

    // This HTML is now DYNAMIC based on the 'report' object
    card.innerHTML = `
      <h3 style="color:#fff; margin-bottom:10px;">
        🩺 Dynamic Guardian — Unified State Report
      </h3>
      <pre style="line-height:1.4; font-size:14px; white-space:pre-wrap;">
Avg Heart Rate: ${report.avgHeartRate?.toFixed(2) ?? 'N/A'}
Avg HRV: ${report.avgHRV?.toFixed(2) ?? 'N/A'}
Avg CO₂: ${report.avgCO2?.toFixed(2) ?? 'N/A'}
Avg Brake Pressure: ${report.avgBrakePressure?.toFixed(2) ?? 'N/A'}
Avg Accel Z: ${report.avgAccelZ?.toFixed(2) ?? 'N/A'}

💤 Fatigue: ${report.fatigue ?? 'N/A'}
😊 Stress: ${report.stress ?? 'N/A'}
💥 Road: ${report.road ?? 'N/A'}
🚶 Braking: ${report.braking ?? 'N/A'}

⚠️ OVERALL: ${report.overall ?? 'N/A'}
      </pre>
    `;

    content.prepend(card); // Add card to top
  }

  // === Modal Open/Close (MODIFIED) ===
  function open() {
    render(); // No longer needs params, it reads from 'latest' and 'latestGuardianReport'
    overlay.hidden = false;
  }

  function close() {
    overlay.hidden = true;
  }

  exploreBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) close();
  });

  // === Event Listeners for Data ===
  
  // 1. This listener for SIMULATED data from app.js (unchanged)
  document.addEventListener("dashboard:safety-update", (event) => {
    latest = event.detail;
    if (!overlay.hidden) render();
  });
  
  // 2. NEW: This listener for REAL-TIME data from Firebase
  onValue(guardianReportRef, (snapshot) => {
    if (snapshot.exists()) {
      latestGuardianReport = snapshot.val();
      
      // If the modal is currently open, re-render it
      if (!overlay.hidden) {
        render();
      }
    } else {
      console.warn("Guardian data not found at:", guardianReportRef.path);
      latestGuardianReport = guardianDefaults; // Show defaults
      if (!overlay.hidden) render();
    }
  }, (error) => {
    console.error("Firebase read error:", error);
    // You could set default error values here
    latestGuardianReport = {
      ...guardianDefaults,
      overall: "Error connecting to Firebase."
    };
    if (!overlay.hidden) render();
  });
  
})();