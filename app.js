/* ================= CONFIG ================= */
const API_BASE = "https://sensor-intelligence-api.onrender.com";
const DURATION = 10; // seconds

/* ===== DEVICE ID LOGIC ===== */
function getDeviceId() {
  // APK (Android WebView)
  if (window.Android && typeof Android.getDeviceId === "function") {
    return Android.getDeviceId();
  }

  // Browser → fixed to your laptop agent
  return "Prakhyat";
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
        label: "Sensor Value",
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
          title: { display: true, text: "Value" }
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
  const res = await fetch(`${API_BASE}/${type}?device_id=${DEVICE_ID}`);
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

  if (type === "mobile") {
    statusLabel.innerText = "Network Status";
    confidenceLabel.innerText = "Speed (KB/s)";
    healthLabel.innerText = "Quality";
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

      /* ===== GRAPH VALUES ===== */
      if (type === "battery") {
        lastValue = latestData.end_percent || 0;
      }

      if (type === "wifi") {
        lastValue = latestData.connected
          ? latestData.signal_percent
          : 0;
      }

      if (type === "mobile") {
        if(!latestData.speed_kbps){
          throw new Error("Phone data not available.Open Setinel app on phone");
        }
        lastValue = latestData.speed_kbps || 0;
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

      /* ===== BATTERY RESULT ===== */
      if (type === "battery") {
        let statusText;

        if (latestData.charging) {
          statusText = "Charging (Normal)";
        } else if (latestData.delta < 0) {
          statusText = "Battery Consuming";
        } else {
          statusText = "Stable Consumption";
        }

        document.getElementById("mStatus").innerText = statusText;
        document.getElementById("mConfidence").innerText = "Trend-based";
        document.getElementById("mHealth").innerText =
          latestData.end_percent + "%";

        const summary = document.getElementById("summary");
        summary.className = "summary HEALTHY";
        summary.innerText = "Battery analysis completed";
        summary.classList.remove("hidden");
      }

      /* ===== WIFI RESULT ===== */
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
          latestData.signal_percent >= 60 ? "summary HEALTHY" :
          latestData.signal_percent >= 30 ? "summary DRIFTING" :
          "summary FAULTY";

        summary.innerText = "Wi-Fi analysis completed";
        summary.classList.remove("hidden");
      }

      /* ===== MOBILE RESULT ===== */
      if (type === "mobile") {

        if (!latestData || latestData.speed_kbps === undefined) {
          document.getElementById("mStatus").innerText = "No Data";
          document.getElementById("mConfidence").innerText = "–";
          document.getElementById("mHealth").innerText = "–";

          const summary = document.getElementById("summary");
          summary.className = "summary FAULTY";
          summary.innerText = "Mobile speed data not available";
          summary.classList.remove("hidden");
          return;
        }

        const speed = latestData.speed_kbps;

        document.getElementById("mStatus").innerText = "Active";
        document.getElementById("mConfidence").innerText = speed + " KB/s";

        document.getElementById("mHealth").innerText =
          speed >= 500 ? "Good" :
          speed >= 150 ? "Moderate" :
          "Slow";

        const summary = document.getElementById("summary");
        summary.className =
          speed >= 500 ? "summary HEALTHY" :
          speed >= 150 ? "summary DRIFTING" :
          "summary FAULTY";

        summary.innerText = "Internet speed analysis completed";
        summary.classList.remove("hidden");
      }
    }
  }, 1000);
}
