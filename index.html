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

  /* ----- Speedometer (0–5 Mbps) ----- */
  const gctx = document.getElementById("speedGauge")?.getContext("2d");
  if (gctx) {
    gauge = new Chart(gctx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [0, 5],
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

/* ================= UI HELPERS ================= */

function showGraph() {
  document.getElementById("chart").style.display = "block";
  document.getElementById("speedSection").style.display = "none";
}

function showGauge() {
  document.getElementById("chart").style.display = "none";
  document.getElementById("speedSection").style.display = "block";
}

function resetGauge() {
  if (!gauge) return;
  gauge.data.datasets[0].data = [0, 5];
  gauge.update();
}

function updateGauge(mbps) {
  if (!gauge) return;
  const max = 5;
  const value = Math.min(mbps, max);
  gauge.data.datasets[0].data = [value, max - value];
  gauge.update();
}

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

  resetGauge();
}

/* ================= FETCH ================= */

async function fetchData(type) {
  const res = await fetch(`${API_BASE}/${type}?device_id=${DEVICE_ID}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/* ================= SPEED QUALITY ================= */

function getSpeedQuality(mbps) {
  if (mbps < 1) return "Slow";
  if (mbps < 3) return "Moderate";
  return "Good";
}

/* ================= RUN ANALYSIS ================= */

async function runAnalysis() {

  const type = document.getElementById("sensorType").value;
  if (!type) {
    alert("Please select a sensor");
    return;
  }

  /* Trigger manual speed test (APK) */
  if ((type === "mobile" || type === "wifi") &&
      window.Android &&
      typeof Android.testSpeed === "function") {
    Android.testSpeed();
  }

  /* ----- Labels (OLD STYLE) ----- */
  const statusLabel = document.querySelector(".metrics tr:nth-child(2) td:first-child");
  const confidenceLabel = document.querySelector(".metrics tr:nth-child(3) td:first-child");
  const healthLabel = document.querySelector(".metrics tr:nth-child(4) td:first-child");

  if (type === "battery") {
    statusLabel.innerText = "Battery Status";
    confidenceLabel.innerText = "Battery Reliability";
    healthLabel.innerText = "Battery Percentage";
    showGraph();
  }

  if (type === "wifi") {
    statusLabel.innerText = "Connection Status";
    confidenceLabel.innerText = "Speed (Mbps)";
    healthLabel.innerText = "Quality";
    showGauge();
  }

  if (type === "mobile") {
    statusLabel.innerText = "Network Status";
    confidenceLabel.innerText = "Speed (Mbps)";
    healthLabel.innerText = "Quality";
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
      }

      /* ===== WIFI ===== */
      if (type === "wifi") {

        if (!latestData.connected) {
          clearInterval(timer);
          countdown.classList.add("hidden");

          document.getElementById("mStatus").innerText = "Not Connected";
          document.getElementById("mConfidence").innerText = "–";
          document.getElementById("mHealth").innerText = "–";

          const summary = document.getElementById("summary");
          summary.className = "summary FAULTY";
          summary.innerText = "WiFi is not connected";
          summary.classList.remove("hidden");
          return;
        }

        const mbps = (latestData.speed_kbps || 0) / 1024;
        updateGauge(mbps);

        document.getElementById("mStatus").innerText =
          `Connected (${latestData.ssid})`;

        document.getElementById("mConfidence").innerText =
          mbps.toFixed(2) + " Mbps";

        document.getElementById("mHealth").innerText =
          getSpeedQuality(mbps);
      }

      /* ===== MOBILE ===== */
      if (type === "mobile") {

        if (!latestData.connected) {
          clearInterval(timer);
          countdown.classList.add("hidden");

          document.getElementById("mStatus").innerText = "Not Active";
          document.getElementById("mConfidence").innerText =
            latestData.message || "Mobile data OFF";
          document.getElementById("mHealth").innerText = "–";

          const summary = document.getElementById("summary");
          summary.className = "summary FAULTY";
          summary.innerText =
            latestData.message || "Mobile data OFF or WiFi active";
          summary.classList.remove("hidden");
          return;
        }

        const mbps = (latestData.speed_kbps || 0) / 1024;
        updateGauge(mbps);

        document.getElementById("mStatus").innerText = "Active";
        document.getElementById("mConfidence").innerText =
          mbps.toFixed(2) + " Mbps";

        document.getElementById("mHealth").innerText =
          getSpeedQuality(mbps);
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
      summary.className = "summary HEALTHY";
      summary.innerText = "Analysis completed";
      summary.classList.remove("hidden");
    }

  }, 1000);
}
