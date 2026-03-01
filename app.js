/* ================= CONFIG ================= */
const API_BASE = "https://sensor-intelligence-api.onrender.com";
const DURATION = 10;

/* ===== DEVICE ID ===== */
function getDeviceId() {
  if (window.Android && typeof Android.getDeviceId === "function") {
    return Android.getDeviceId();
  }
  return "Prakhyat";
}

const DEVICE_ID = getDeviceId();

let chart = null;
let gauge = null;
let timer = null;

/* ================= INIT UI ================= */
window.addEventListener("DOMContentLoaded", () => {

  /* ----- Battery Graph ----- */
  const ctx = document.getElementById("chart")?.getContext("2d");
  if (ctx) {
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "Battery %",
          data: [],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.1)",
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          y: { min: 0, max: 100 }
        }
      }
    });
  }

  /* ----- Premium Speedometer (0–3 Mbps) ----- */
  const gctx = document.getElementById("speedGauge")?.getContext("2d");
  if (gctx) {
    gauge = new Chart(gctx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [0, 3],
          backgroundColor: ["#22c55e", "#e5e7eb"],
          borderWidth: 0
        }]
      },
      options: {
        rotation: -90,
        circumference: 180,
        cutout: "70%",
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
});

/* ================= VIEW CONTROL ================= */

function showGraph() {
  document.getElementById("chart").style.display = "block";
  document.getElementById("speedSection").style.display = "none";
}

function showGauge() {
  document.getElementById("chart").style.display = "none";
  document.getElementById("speedSection").style.display = "block";
}

/* Reset when sensor changes */
function onSensorChange() {
  resetUI();

  if (gauge) {
    gauge.data.datasets[0].data = [0, 3];
    gauge.update();
  }

  const label = document.getElementById("speedValue");
  if (label) label.innerText = "0 Mbps";
}

/* Update gauge */
function updateGauge(mbps) {
  if (!gauge) return;

  const max = 3;
  const value = Math.min(mbps, max);

  let color = "#ef4444";
  if (value >= 2) color = "#22c55e";
  else if (value >= 1) color = "#f59e0b";

  gauge.data.datasets[0].data = [value, max - value];
  gauge.data.datasets[0].backgroundColor = [color, "#e5e7eb"];
  gauge.update();

  const label = document.getElementById("speedValue");
  if (label) label.innerText = value.toFixed(2) + " Mbps";
}

/* ================= RESET ================= */

function resetUI() {
  document.getElementById("mStatus").innerText = "–";
  document.getElementById("mConfidence").innerText = "–";
  document.getElementById("mHealth").innerText = "–";

  const summary = document.getElementById("summary");
  summary.classList.add("hidden");
  summary.innerText = "";

  if (chart) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
  }
}

/* ================= FETCH ================= */

async function fetchData(type) {
  const res = await fetch(`${API_BASE}/${type}?device_id=${DEVICE_ID}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/* ================= RUN ANALYSIS ================= */

async function runAnalysis() {

  const type = document.getElementById("sensorType").value;
  if (!type) {
    alert("Select a sensor");
    return;
  }

  /* Trigger manual speed test in APK */
  if ((type === "mobile" || type === "wifi") &&
      window.Android &&
      typeof Android.testSpeed === "function") {
    Android.testSpeed();
  }

  /* Labels */
  const lStatus = document.getElementById("lStatus");
  const lConfidence = document.getElementById("lConfidence");
  const lHealth = document.getElementById("lHealth");

  if (type === "battery") {
    lStatus.innerText = "Battery Status";
    lConfidence.innerText = "Battery %";
    lHealth.innerText = "State";
    showGraph();
  } else {
    lStatus.innerText = "Connection";
    lConfidence.innerText = "Speed";
    lHealth.innerText = "Quality";
    showGauge();
  }

  resetUI();

  const countdown = document.getElementById("countdown");
  countdown.classList.remove("hidden");

  let timeLeft = DURATION;
  let latestData = null;

  clearInterval(timer);

  timer = setInterval(async () => {

    countdown.innerText = `Analyzing… ${timeLeft}s`;

    try {
      latestData = await fetchData(type);

      /* ===== BATTERY ===== */
      if (type === "battery") {
        const value = latestData.end_percent || 0;
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(value);
        chart.update();

        document.getElementById("mStatus").innerText =
          latestData.charging ? "Charging" : "Discharging";

        document.getElementById("mConfidence").innerText =
          value + "%";

        document.getElementById("mHealth").innerText =
          value >= 50 ? "Normal" : "Low";
      }

      /* ===== WIFI ===== */
      if (type === "wifi") {

        if (!latestData.connected) {
          document.getElementById("mStatus").innerText = "Not Connected";
          return;
        }

        const mbps = (latestData.speed_kbps || 0) / 1024;
        updateGauge(mbps);

        document.getElementById("mStatus").innerText =
          `Connected (${latestData.ssid})`;

        document.getElementById("mConfidence").innerText =
          mbps.toFixed(2) + " Mbps";

        document.getElementById("mHealth").innerText =
          latestData.signal_percent >= 60 ? "Strong" :
          latestData.signal_percent >= 30 ? "Moderate" :
          "Weak";
      }

      /* ===== MOBILE ===== */
      if (type === "mobile") {

        if (!latestData.connected) {
          document.getElementById("mStatus").innerText =
            latestData.message || "Mobile OFF";
          return;
        }

        const mbps = (latestData.speed_kbps || 0) / 1024;
        updateGauge(mbps);

        document.getElementById("mStatus").innerText = "Active";
        document.getElementById("mConfidence").innerText =
          mbps.toFixed(2) + " Mbps";

        document.getElementById("mHealth").innerText =
          mbps >= 2 ? "Good" :
          mbps >= 1 ? "Moderate" :
          "Slow";
      }

    } catch (err) {
      clearInterval(timer);
      countdown.classList.add("hidden");
      alert(err.message);
      return;
    }

    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(timer);
      countdown.classList.add("hidden");

      const summary = document.getElementById("summary");
      summary.classList.remove("hidden");

      if (type === "battery")
        summary.innerText = latestData.charging ? "Battery charging normally" : "Battery consumption normal";
      if (type === "wifi")
        summary.innerText = "WiFi quality analysis completed";
      if (type === "mobile")
        summary.innerText = "Mobile speed analysis completed";
    }

  }, 1000);
}
