/* ================= CONFIG ================= */
const API_BASE = "https://sensor-intelligence-api.onrender.com";
const DURATION = 10;
const MAX_MBPS = 5;

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
          data: [0, MAX_MBPS],
          backgroundColor: ["#22c55e", "#e5e7eb"],
          borderWidth: 0
        }]
      },
      options: {
        rotation: -90,
        circumference: 180,
        cutout: "70%",
        plugins: { legend: { display: false } },
        responsive: true
      }
    });
  }
});

/* ================= UI HELPERS ================= */

function updateGauge(mbps) {
  if (!gauge) return;

  const value = Math.min(mbps, MAX_MBPS);
  gauge.data.datasets[0].data = [value, MAX_MBPS - value];
  gauge.update();

  const label = document.getElementById("speedValue");
  if (label) label.innerText = value.toFixed(2) + " Mbps";
}

function showGraph() {
  document.getElementById("chart").style.display = "block";
  document.getElementById("speedSection").style.display = "none";
}

function showGauge() {
  document.getElementById("chart").style.display = "none";
  document.getElementById("speedSection").style.display = "block";
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

  clearInterval(timer);
  resetUI();

  /* Trigger manual speed test for APK */
  if ((type === "mobile" || type === "wifi") &&
      window.Android &&
      typeof Android.testSpeed === "function") {
    Android.testSpeed();
  }

  /* ===== LABELS ===== */
  if (type === "battery") {
    document.getElementById("lStatus").innerText = "Battery Status";
    document.getElementById("lConfidence").innerText = "Battery %";
    document.getElementById("lHealth").innerText = "Consumption";
    showGraph();
  }

  if (type === "wifi") {
    document.getElementById("lStatus").innerText = "Connection Status";
    document.getElementById("lConfidence").innerText = "Speed (Mbps)";
    document.getElementById("lHealth").innerText = "Quality";
    showGauge();
  }

  if (type === "mobile") {
    document.getElementById("lStatus").innerText = "Network Status";
    document.getElementById("lConfidence").innerText = "Speed (Mbps)";
    document.getElementById("lHealth").innerText = "Quality";
    showGauge();
  }

  const countdown = document.getElementById("countdown");
  countdown.classList.remove("hidden");

  let timeLeft = DURATION;
  let latestData = null;

  timer = setInterval(async () => {

    countdown.innerText = `Analyzing… ${timeLeft}s`;

    try {
      latestData = await fetchData(type);

      /* ===== BATTERY (FINAL FIX) ===== */
      if (type === "battery") {

        const value = latestData.end_percent || 0;
        const isCharging = latestData.charging === true;
        const delta = latestData.delta || 0;

        // Graph
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(value);
        chart.update();

        // Table
        document.getElementById("mStatus").innerText =
          isCharging ? "Charging" : "Discharging";

        document.getElementById("mConfidence").innerText =
          value + "%";

        if (isCharging) {
          document.getElementById("mHealth").innerText =
            "Charging (Consumption paused)";
        } else {
          document.getElementById("mHealth").innerText =
            Math.abs(delta) >= 2
              ? "High Consumption"
              : "Normal Consumption";
        }
      }

      /* ===== WIFI ===== */
      if (type === "wifi") {

        if (!latestData.connected) {
          clearInterval(timer);
          countdown.classList.add("hidden");

          document.getElementById("mStatus").innerText = "WiFi Not Connected";
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
          mbps > 3 ? "Good" :
          mbps >= 1 ? "Moderate" : "Slow";
      }

      /* ===== MOBILE ===== */
      if (type === "mobile") {

        if (!latestData.connected) {
          clearInterval(timer);
          countdown.classList.add("hidden");

          document.getElementById("mStatus").innerText = "Mobile Data OFF";
          document.getElementById("mConfidence").innerText =
            latestData.message || "Not available";
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
          mbps > 3 ? "Good" :
          mbps >= 1 ? "Moderate" : "Slow";
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

      /* Battery Summary */
      if (type === "battery") {
        const isCharging = latestData.charging === true;
        const delta = latestData.delta || 0;

        if (isCharging) {
          summary.innerText = "Battery is Charging";
        } else {
          summary.innerText =
            Math.abs(delta) >= 2
              ? "High Battery Consumption"
              : "Battery Consumption Normal";
        }
      }

      /* WiFi Summary */
      if (type === "wifi") {
        const mbps = (latestData.speed_kbps || 0) / 1024;
        summary.innerText =
          mbps > 3 ? "Strong Connection" :
          mbps >= 1 ? "Moderate Connection" :
          "Weak Connection";
      }

      /* Mobile Summary */
      if (type === "mobile") {
        const mbps = (latestData.speed_kbps || 0) / 1024;
        summary.innerText =
          mbps > 3 ? "Good Speed" :
          mbps >= 1 ? "Moderate Speed" :
          "Slow Internet";
      }
    }

  }, 1000);
}
