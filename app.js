// Simple, readable JS powering gauges, simulated data, CAN frames, and actions.

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

function formatHexId(id) {
  return `0x${id.toString(16).toUpperCase().padStart(3, '0')}`;
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour12: false });
}

function createGauge(containerId, options) {
  const container = document.getElementById(containerId);
  const cfg = Object.assign(
    {
      size: 180,
      thickness: 14,
      min: 0,
      max: 100,
      value: 0,
      colorClass: 'power',
    },
    options || {}
  );

  const size = cfg.size;
  const stroke = cfg.thickness;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = Math.PI * 0.75; // 135°
  const endAngle = Math.PI * 2.25; // 405°
  const arcLen = endAngle - startAngle;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  function polarToXY(angle) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  function describeArc(fromAngle, toAngle) {
    const start = polarToXY(fromAngle);
    const end = polarToXY(toAngle);
    const largeArcFlag = toAngle - fromAngle <= Math.PI ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  const bg = document.createElementNS(svgNS, 'path');
  bg.setAttribute('d', describeArc(startAngle, endAngle));
  bg.setAttribute('class', 'arc-bg');
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke-width', String(stroke));

  const fg = document.createElementNS(svgNS, 'path');
  fg.setAttribute('d', describeArc(startAngle, startAngle));
  fg.setAttribute('class', `arc-fg ${cfg.colorClass}`);
  fg.setAttribute('fill', 'none');
  fg.setAttribute('stroke-linecap', 'round');
  fg.setAttribute('stroke-width', String(stroke));

  const text = document.createElementNS(svgNS, 'text');
  text.setAttribute('x', String(cx));
  text.setAttribute('y', String(cy + 12));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('class', 'gauge-text');
  text.setAttribute('font-size', String(size * 0.16));
  text.textContent = String(cfg.value);

  svg.appendChild(bg);
  svg.appendChild(fg);
  svg.appendChild(text);
  container.innerHTML = '';
  container.appendChild(svg);

  function setValue(nextValue) {
    const v = clamp(nextValue, cfg.min, cfg.max);
    const pct = (v - cfg.min) / (cfg.max - cfg.min);
    const toAngle = startAngle + pct * arcLen;
    fg.setAttribute('d', describeArc(startAngle, toAngle));
    text.textContent = String(Math.round(v));
  }

  setValue(cfg.value);
  return { setValue };
}

// Initialize gauges
const gauges = {
  power: createGauge('gauge-power', { min: 0, max: 350, colorClass: 'power', size: 220, value: 0 }),
  torque: createGauge('gauge-torque', { min: 0, max: 600, colorClass: 'torque', size: 220, value: 0 }),
  rpm: createGauge('gauge-rpm', { min: 0, max: 9000, colorClass: 'rpm', size: 200, value: 0 }),
  speed: createGauge('gauge-speed', { min: 0, max: 260, colorClass: 'speed', size: 200, value: 0 }),
  soc: createGauge('gauge-soc', { min: 0, max: 100, colorClass: 'soc', size: 160, value: 0 }),
  coolant: createGauge('gauge-coolant', { min: -20, max: 120, colorClass: 'coolant', size: 160, value: 0 }),
};

// Utilities to update numeric labels next to gauges
const valueEls = {
  power: document.getElementById('val-power'),
  torque: document.getElementById('val-torque'),
  rpm: document.getElementById('val-rpm'),
  speed: document.getElementById('val-speed'),
  soc: document.getElementById('val-soc'),
  coolant: document.getElementById('val-coolant'),
};

const lastTelemetry = {
  power: 0,
  torque: 0,
  rpm: 0,
  speed: 0,
  coolant: 0,
};

const lastBmsState = {
  voltage: 0,
  current: 0,
  temp: 0,
  delta: 0,
  soc: 0,
};

const lastSafety = {
  status: 'Stable',
  score: 0,
  desc: 'Model indicates nominal driving pattern.',
};

function updateGauge(name, val) {
  if (gauges[name]) gauges[name].setValue(val);
  if (valueEls[name]) valueEls[name].textContent = String(Math.round(val));
}

// Simulated telemetry stream
let simTick = 0;
function simulateTelemetry() {
  simTick += 1;
  const power = 180 + 140 * Math.sin(simTick / 22);
  const torque = 300 + 200 * Math.sin(simTick / 26 + 0.7);
  const rpm = 2200 + 2500 * Math.abs(Math.sin(simTick / 18));
  const speed = 48 + 65 * Math.abs(Math.sin(simTick / 24 + 0.2));
  const soc = 70 - (simTick % 800) / 80; // slow discharge
  const coolant = 65 + 25 * Math.abs(Math.sin(simTick / 30 + 1.1));

  updateGauge('power', clamp(power, 0, 350));
  updateGauge('torque', clamp(torque, 0, 600));
  updateGauge('rpm', clamp(rpm, 0, 9000));
  updateGauge('speed', clamp(speed, 0, 260));
  updateGauge('soc', clamp(soc, 0, 100));
  updateGauge('coolant', clamp(coolant, -20, 120));

  lastTelemetry.power = clamp(power, 0, 350);
  lastTelemetry.torque = clamp(torque, 0, 600);
  lastTelemetry.rpm = clamp(rpm, 0, 9000);
  lastTelemetry.speed = clamp(speed, 0, 260);
  lastTelemetry.coolant = clamp(coolant, -20, 120);

  // BMS derived values
  const packVoltage = 360 + 20 * Math.sin(simTick / 40) + (soc - 50) * 0.3; // ~360-380V
  const packCurrent = (power > 0 && packVoltage > 0) ? (power * 1000) / packVoltage : 0; // A
  const packTemp = 28 + 10 * Math.abs(Math.sin(simTick / 50 + 0.5));
  const cellDeltaMv = 6 + 5 * Math.abs(Math.sin(simTick / 35 + 0.9));
  updateBmsMetrics({
    voltage: clamp(packVoltage, 320, 420),
    current: clamp(packCurrent, -400, 600),
    temp: clamp(packTemp, -10, 80),
    delta: clamp(cellDeltaMv, 0, 40),
    soc: clamp(soc, 0, 100),
  });

  updateSafetyInsights();
}

let telemetryInterval = setInterval(simulateTelemetry, 120);

// Diagnostics (DTC) list — simulated
const dtcListEl = document.getElementById('dtc-list');
const sampleDtcs = [
  { code: 'P0420', severity: 'Medium', desc: 'Catalyst system efficiency below threshold (Bank 1)' },
  { code: 'C0035', severity: 'Low', desc: 'Left Front Wheel Speed Sensor circuit' },
];

function renderDtcList(list) {
  dtcListEl.innerHTML = '';
  list.forEach((d) => {
    const li = document.createElement('li');
    li.className = 'dtc-item';
    li.innerHTML = `
      <span class="badge">${d.code}</span>
      <span class="desc">${d.desc}</span>
      <span class="sev" title="Severity">${d.severity}</span>
    `;
    dtcListEl.appendChild(li);
  });
}
renderDtcList(sampleDtcs);

document.getElementById('btn-clear-dtc').addEventListener('click', () => {
  renderDtcList([]);
});

// CAN Bus table — simulated frames
const canTableBody = document.querySelector('#can-table tbody');
const canFilterInput = document.getElementById('can-filter');
const canStreamToggle = document.getElementById('toggle-can-stream');
let canStreamOn = false;

function randomBytes(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 256));
}

function emitCanFrame() {
  const id = Math.floor(Math.random() * 0x7ff); // standard 11-bit
  const dlc = Math.floor(Math.random() * 9); // 0-8 bytes
  const data = randomBytes(dlc);
  const filter = canFilterInput.value.trim().toUpperCase();
  const idHex = formatHexId(id);
  if (filter && !idHex.includes(filter.replace('0X', ''))) return;

  const tr = document.createElement('tr');
  const tdTime = document.createElement('td');
  const tdId = document.createElement('td');
  const tdDlc = document.createElement('td');
  const tdData = document.createElement('td');
  tdTime.textContent = nowTime();
  tdId.textContent = idHex;
  tdDlc.textContent = String(dlc);
  tdData.textContent = data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  tr.appendChild(tdTime);
  tr.appendChild(tdId);
  tr.appendChild(tdDlc);
  tr.appendChild(tdData);
  canTableBody.prepend(tr);

  const maxRows = 300;
  while (canTableBody.rows.length > maxRows) {
    canTableBody.deleteRow(-1);
  }
}

let canInterval = null;
function setCanStreaming(on) {
  canStreamOn = on;
  if (on) {
    if (canInterval) clearInterval(canInterval);
    canInterval = setInterval(emitCanFrame, 150);
  } else if (canInterval) {
    clearInterval(canInterval);
    canInterval = null;
  }
}

canStreamToggle.addEventListener('change', (e) => setCanStreaming(e.target.checked));
canFilterInput.addEventListener('input', () => {
  // Re-render by clearing; new frames will respect filter
  canTableBody.innerHTML = '';
});

// Header actions
document.getElementById('btn-info').addEventListener('click', () => {
  // Simulate a data refresh burst
  for (let i = 0; i < 10; i += 1) simulateTelemetry();
});

document.getElementById('btn-connect').addEventListener('click', async () => {
  // Placeholder: integrate with real CAN adapter via WebSerial/WebUSB or backend API.
  // For now, toggle streaming and provide a quick state change.
  const next = !canStreamOn;
  setCanStreaming(next);
  document.getElementById('btn-connect').textContent = next ? 'Disconnect CAN' : 'Connect CAN';
});

// -----------------
// BMS Metrics & Chart
// -----------------
const bmsEls = {
  voltage: document.getElementById('bms-voltage'),
  current: document.getElementById('bms-current'),
  temp: document.getElementById('bms-temp'),
  delta: document.getElementById('bms-delta'),
};

const chartCanvas = document.getElementById('bms-chart');
const ctx = chartCanvas ? chartCanvas.getContext('2d') : null;
const chartData = { time: [], voltage: [], current: [], temp: [], soc: [] };
const chartMaxPoints = 240; // about ~30s at 120ms interval

const aiEls = {
  label: document.getElementById('ai-risk-label'),
  desc: document.getElementById('ai-risk-desc'),
  battery: document.getElementById('ai-battery-health'),
  driver: document.getElementById('ai-driver-strain'),
  thermal: document.getElementById('ai-thermal'),
  telemetry: document.getElementById('ai-telemetry'),
};

function updateBmsMetrics({ voltage, current, temp, delta, soc }) {
  if (bmsEls.voltage) bmsEls.voltage.textContent = String(Math.round(voltage));
  if (bmsEls.current) bmsEls.current.textContent = String(Math.round(current));
  if (bmsEls.temp) bmsEls.temp.textContent = String(Math.round(temp));
  if (bmsEls.delta) bmsEls.delta.textContent = String(Math.round(delta));

  lastBmsState.voltage = voltage;
  lastBmsState.current = current;
  lastBmsState.temp = temp;
  lastBmsState.delta = delta;
  lastBmsState.soc = soc;

  // push into chart series
  const t = performance.now() / 1000;
  chartData.time.push(t);
  chartData.voltage.push(voltage);
  chartData.current.push(current);
  chartData.temp.push(temp);
  chartData.soc.push(soc);
  // trim
  const keys = Object.keys(chartData);
  keys.forEach((k) => {
    const arr = chartData[k];
    if (arr.length > chartMaxPoints) arr.splice(0, arr.length - chartMaxPoints);
  });

  drawChart();
}

function drawChart() {
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const styleW = chartCanvas.clientWidth;
  const styleH = chartCanvas.clientHeight;
  if (chartCanvas.width !== Math.floor(styleW * dpr)) chartCanvas.width = Math.floor(styleW * dpr);
  if (chartCanvas.height !== Math.floor(styleH * dpr)) chartCanvas.height = Math.floor(styleH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, styleW, styleH);

  // axes
  const padding = 28;
  const plotW = styleW - padding * 2;
  const plotH = styleH - padding * 2;
  const originX = padding;
  const originY = styleH - padding;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = originY - (plotH * i) / 4;
    ctx.moveTo(originX, y);
    ctx.lineTo(originX + plotW, y);
  }
  ctx.stroke();

  if (chartData.time.length < 2) return;
  const xMin = chartData.time[0];
  const xMax = chartData.time[chartData.time.length - 1];
  function xScale(t) { return originX + ((t - xMin) / (xMax - xMin)) * plotW; }

  // Scales per series
  const yRanges = {
    voltage: [320, 420],
    current: [-100, 600],
    temp: [-10, 80],
    soc: [0, 100],
  };
  function yScale(v, key) {
    const [min, max] = yRanges[key];
    return originY - ((v - min) / (max - min)) * plotH;
  }

  function strokeSeries(key, color, width) {
    const arr = chartData[key];
    if (!arr || arr.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const x = xScale(chartData.time[i]);
      const y = yScale(arr[i], key);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  strokeSeries('voltage', '#22d3ee', 2);
  strokeSeries('current', '#3b82f6', 1.8);
  strokeSeries('temp', '#f59e0b', 1.6);
  strokeSeries('soc', '#10b981', 1.6);
}

function updateSafetyInsights() {
  if (!aiEls.label) return;

  const speed = lastTelemetry.speed;
  const torque = lastTelemetry.torque;
  const coolant = lastTelemetry.coolant;
  const soc = lastBmsState.soc;
  const delta = lastBmsState.delta;
  const packTemp = lastBmsState.temp;
  const packCurrent = lastBmsState.current;

  // Simple heuristic to mimic an ML model risk prediction (0 safe -> 1 danger)
  const speedScore = speed / 200;
  const torqueScore = Math.max(0, torque - 420) / 280;
  const thermalScore = Math.max(0, coolant - 95) / 35;
  const batteryStress = Math.max(0, packCurrent - 350) / 250 + Math.max(0, delta - 18) / 30;
  const lowSocPenalty = soc < 20 ? (20 - soc) / 20 : 0;
  const riskScore = clamp(speedScore * 0.35 + torqueScore * 0.2 + thermalScore * 0.2 + batteryStress * 0.2 + lowSocPenalty * 0.15, 0, 2);

  let status = 'Stable';
  let statusClass = 'safe';
  let desc = 'Model indicates nominal driving pattern.';

  if (riskScore > 1.1) {
    status = 'Critical';
    statusClass = 'danger';
    desc = 'High likelihood of incident detected — brake assist primed, alerting recommended.';
  } else if (riskScore > 0.55) {
    status = 'Caution';
    statusClass = 'caution';
    desc = 'Elevated stress observed. Reduce speed and monitor vehicle feedback.';
  }

  aiEls.label.textContent = status;
  aiEls.label.classList.remove('safe', 'caution', 'danger');
  aiEls.label.classList.add(statusClass);
  if (aiEls.desc) aiEls.desc.textContent = desc;

  lastSafety.status = status;
  lastSafety.score = riskScore;
  lastSafety.desc = desc;

  if (aiEls.battery) {
    const batteryMsg = soc > 65 ? 'Excellent' : soc > 35 ? 'Moderate' : 'Low';
    aiEls.battery.textContent = `${batteryMsg} (${Math.round(soc)}%)`;
  }

  if (aiEls.driver) {
    const driverScore = clamp(speedScore + torqueScore, 0, 2);
    let driverLoad = 'Low';
    if (driverScore > 1.3) driverLoad = 'High';
    else if (driverScore > 0.6) driverLoad = 'Medium';
    aiEls.driver.textContent = driverLoad;
  }

  if (aiEls.thermal) {
    const thermalMsg = packTemp > 50 || coolant > 95 ? 'Hot' : packTemp > 40 ? 'Warm' : 'Nominal';
    aiEls.thermal.textContent = thermalMsg;
  }

  let telemetryMsg = 'All systems green';
  if (delta > 18) telemetryMsg = 'Cell balancing required';
  if (riskScore > 1.1) telemetryMsg = 'Automatic restraint & alert ready';
  if (aiEls.telemetry) aiEls.telemetry.textContent = telemetryMsg;

  document.dispatchEvent(new CustomEvent('dashboard:safety-update', {
    detail: {
      safety: {
        status,
        score: riskScore,
        desc,
        telemetryMessage: telemetryMsg,
      },
      driverLoad: aiEls.driver?.textContent || 'Unknown',
      telemetry: {
        speed,
        torque,
        coolant,
      },
      bms: {
        voltage: lastBmsState.voltage,
        current: lastBmsState.current,
        temp: lastBmsState.temp,
        delta: lastBmsState.delta,
        soc: lastBmsState.soc,
      },
    },
  }));
}

// -------------
// Cursor effects
// -------------
const blob = document.querySelector('.cursor-blob');
let blobX = window.innerWidth / 2;
let blobY = window.innerHeight / 2;
let targetX = blobX;
let targetY = blobY;

function animateBlob() {
  const k = 0.18;
  blobX += (targetX - blobX) * k;
  blobY += (targetY - blobY) * k;
  if (blob) blob.style.transform = `translate(${blobX}px, ${blobY}px)`;
  requestAnimationFrame(animateBlob);
}
if (blob) {
  requestAnimationFrame(animateBlob);
  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });
  window.addEventListener('mousedown', () => { blob.style.transform += ' scale(0.9)'; });
  window.addEventListener('mouseup', () => { blob.style.transform += ' scale(1)'; });
}

// Button hover shine follows cursor
document.querySelectorAll('.btn').forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    btn.style.setProperty('--mx', `${x}%`);
    btn.style.setProperty('--my', `${y}%`);
  });
});

// -----------------
// Safety actions
// -----------------
const emergencyBtn = document.getElementById('btn-alert-emergency');
const familyBtn = document.getElementById('btn-alert-family');

function composeSafetyMessage(type) {
  const time = nowTime();
  const location = 'Lat 37.7749, Long -122.4194'; // placeholder demo coords
  const headline = type === 'emergency' ? 'Emergency assistance requested' : 'Family notification';
  const bmsState = `Battery ${Math.round(lastBmsState.soc)}% | Pack ${Math.round(lastBmsState.voltage)}V`; 
  const telematicsState = `Speed ${Math.round(lastTelemetry.speed)} km/h | Coolant ${Math.round(lastTelemetry.coolant)}°C`;
  return `${headline}\nStatus: ${lastSafety.status} (score ${(lastSafety.score).toFixed(2)})\n${lastSafety.desc}\n${bmsState}\n${telematicsState}\nLast known position: ${location}\nSent at ${time}`;
}

function sendSafetyAlert(type) {
  const message = composeSafetyMessage(type);
  // Replace alert with integration to SMS/Voice service (Twilio, etc.)
  alert(message);
}

emergencyBtn?.addEventListener('click', () => sendSafetyAlert('emergency'));
familyBtn?.addEventListener('click', () => sendSafetyAlert('family'));

// -----------------
// Welcome modal
// -----------------
// (Welcome modal removed)


