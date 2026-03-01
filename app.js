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

/* ================= INIT ================= */
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
        animation: false,
        scales: {
          y: {
            min: 0,
            max: 100
          }
        }
      }
    });
  }

  /* ----- Speedometer Gauge ----- */
  const gctx = document.getElementById("speedGauge")?.getContext("2d");

  if (gctx) {
    gauge = new Chart(gctx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [0, 100],
          backgroundColor: ["#2563eb", "#e5e7eb"],
          borderWidth: 0
        }]
      },
      options: {
        rotation: -90,
        circumference: 180,
        cutout: "70%",
        plugins: { legend: { display: false } }
      }
    });
  }
});

/* ================= UI HELPERS ================= */
function showGraph() {
  document.getElementById("chart").classList.remove("hidden");
  document.getElementById("speedSection").classList.add("hidden");
}

function showGauge() {
  document.getElementById("chart").classList.add("hidden");
  document.getElementById("speedSection").classList.remove("hidden");
}

function updateGauge(valueMbps) {
  if (!gauge) return;

  const max = 100; // max scale = 100 Mbps
  const val = Math.min(valueMbps, max);

  gauge.data.datasets[0].data = [val, max - val];
  gauge.update();
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

  updateGauge(0);
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

  /* Trigger manual speed test (APK) */
  if ((type === "mobile" || type === "wifi") &&
      window.Android && Android.testSpeed) {
    Android.testSpeed();
  }

  /* UI Mode */
  if (type === "battery") showGraph();
  else showGauge();

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

      /* ===== BATTERY GRAPH ===== */
      if (type === "battery") {
        const value = latestData.end_percent || 0;

        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(value);
        chart.update();
      }

      /* ===== WIFI SPEED (Mbps) ===== */
      if (type === "wifi" && latestData.connected) {
        const mbps = (latestData.speed_kbps || 0) / 1024;
        updateGauge(mbps);
      }

      /* ===== MOBILE SPEED (Mbps) ===== */
      if (type === "mobile" && latestData.connected) {
        const mbps = (latestData.speed_kbps || 0) / 1024;
        updateGauge(mbps);
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

      /* ===== RESULTS ===== */

      if (type === "battery") {
        document.getElementById("mStatus").innerText =
          latestData.charging ? "Charging" : "Discharging";
        document.getElementById("mConfidence").innerText = "Trend";
        document.getElementById("mHealth").innerText =
          latestData.end_percent + "%";
      }

      if (type === "wifi") {
        document.getElementById("mStatus").innerText =
          latestData.connected ? `Connected (${latestData.ssid})` : "Not Connected";

        document.getElementById("mConfidence").innerText =
          latestData.signal_percent + "%";

        document.getElementById("mHealth").innerText =
          ((latestData.speed_kbps || 0) / 1024).toFixed(1) + " Mbps";
      }

      if (type === "mobile") {
        document.getElementById("mStatus").innerText =
          latestData.connected ? "Active" : "Mobile OFF / WiFi Active";

        document.getElementById("mConfidence").innerText =
          ((latestData.speed_kbps || 0) / 1024).toFixed(1) + " Mbps";

        document.getElementById("mHealth").innerText =
          latestData.message || "";
      }

      const summary = document.getElementById("summary");
      summary.className = "summary HEALTHY";
      summary.innerText = "Analysis completed";
      summary.classList.remove("hidden");
    }

  }, 1000);
}
