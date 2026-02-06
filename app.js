/* ================= CONFIG ================= */
const API_BASE = "https://sensor-intelligence-api.onrender.com";
const DURATION = 10; // seconds

/* ===== UNIQUE DEVICE ID (APK + WEB) ===== */
function getDeviceId() {

  // If running inside Android APK (WebView)
  if (window.Android && typeof Android.getDeviceId === "function") {
    return Android.getDeviceId();
  }

  // Browser / Laptop
  let id = localStorage.getItem("sentinel_device_id");
  if (!id) {
    id = "web-" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("sentinel_device_id", id);
  }
  return id;
}

const DEVICE_ID = getDeviceId();

let chart = null;
let timer = null;

/* ================= INIT GRAPH ================= */
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Sensor Value (%)",
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
        x: {
          title: { display: true, text: "Time" },
          ticks: { autoSkip: true, maxTicksLimit: 4 },
          grid: { display: false }
        },
        y: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20 },
          title: { display: true, text: "Value (%)" }
        }
      }
    }
  });
});

/* ================= RESET UI ================= */
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
  const res = await fetch(
    `${API_BASE}/${type}?device_id=${DEVICE_ID}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/* ================= RUN ANALYSIS ================= */
async function runAnalysis() {
  const type = document.getElementById("sensorType").value;
  if (!type) {
    alert("Please select a sensor");
    return;
  }

  /* ===== LABELS ===== */
  const statusLabel = document.querySelector(".metrics tr:nth-child(2) td:first-child");
  const confidenceLabel = document.querySelector(".metrics tr:nth-child(3) td:first-child");
  const healthLabel = document.querySelector(".metrics tr:nth-child(4) td:first-child");

  if (type === "battery") {
    statusLabel.innerText = "Battery Status";
    confidenceLabel.innerText = "Battery Reliability";
    healthLabel.innerText = "Battery Percentage";
  }

  if (type === "wifi") {
    statusLabel.innerText = "Connection Status";
    confidenceLabel.innerText = "Signal Intensity";
    healthLabel.innerText = "Signal Quality";
  }

  resetUI();

  const countdown = document.getElementById("countdown");
  countdown.classList.remove("hidden");

  let timeLeft = DURATION;
  let lastValue = 0;
  let latestData = null;

  clearInterval(timer);

  timer = setInterval(async () => {
    countdown.innerText = `Analyzing… ${timeLeft}s`;

    try {
      latestData = await fetchData(type);

      if (type === "battery") {
        lastValue = latestData.end_percent;
      }

      if (type === "wifi") {
        lastValue = latestData.connected
          ? latestData.signal_percent
          : 0;
      }

      chart.data.labels.push(new Date().toLocaleTimeString());
      chart.data.datasets[0].data.push(lastValue);
      chart.update();

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

      /* ===== BATTERY ===== */
      if (type === "battery") {
        let statusText, summaryText;

        if (latestData.charging) {
          statusText = "Charging (Normal)";
          summaryText = "Battery is charging normally";
        } else if (latestData.delta < 0) {
          statusText = "Battery Consuming";
          summaryText = "Battery consumption detected";
        } else {
          statusText = "Stable Consumption";
          summaryText = "No abnormal battery drain detected";
        }

        document.getElementById("mStatus").innerText = statusText;
        document.getElementById("mConfidence").innerText = "Trend-based";
        document.getElementById("mHealth").innerText =
          latestData.end_percent + "%";

        const summary = document.getElementById("summary");
        summary.className = "summary HEALTHY";
        summary.innerText = summaryText;
        summary.classList.remove("hidden");
      }

      /* ===== WIFI ===== */
      if (type === "wifi") {

        if (!latestData.connected) {
          document.getElementById("mStatus").innerText = "Not Connected";
          document.getElementById("mConfidence").innerText = "–";
          document.getElementById("mHealth").innerText = "–";

          const summary = document.getElementById("summary");
          summary.className = "summary FAULTY";
          summary.innerText = "Wi-Fi is not connected";
          summary.classList.remove("hidden");
          return;
        }

        document.getElementById("mStatus").innerText =
          `Connected (${latestData.ssid})`;

        document.getElementById("mConfidence").innerText =
          latestData.signal_percent + "%";

        document.getElementById("mHealth").innerText =
          latestData.signal_percent >= 60 ? "Good" :
          latestData.signal_percent >= 30 ? "Moderate" :
          "Poor";

        const summary = document.getElementById("summary");
        summary.className =
          "summary " +
          (latestData.signal_percent >= 60 ? "HEALTHY" :
           latestData.signal_percent >= 30 ? "DRIFTING" :
           "FAULTY");

        summary.innerText =
          latestData.signal_percent >= 60
            ? "Wi-Fi signal is strong"
            : latestData.signal_percent >= 30
            ? "Wi-Fi signal is moderate"
            : "Wi-Fi signal is weak";

        summary.classList.remove("hidden");
      }
    }
  }, 1000);
}
