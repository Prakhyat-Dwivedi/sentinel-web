/* ================= CONFIG ================= */
const API_BASE = "https://sensor-intelligence-api.onrender.com";
const DURATION = 10; // seconds

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
      animation: false,
      scales: {
        x: { title: { display: true, text: "Time" } },
        y: {
          min: 0,
          max: 100,
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
  const res = await fetch(`${API_BASE}/${type}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/* ================= RUN ANALYSIS ================= */
async function runAnalysis() {
  const type = document.getElementById("sensorType").value;
  // ----- Update table labels based on sensor -----
const confidenceCell = document.querySelector(
  ".metrics tr:nth-child(3) td:first-child"
);

const confidenceCell = document.querySelector(
  ".metrics tr:nth-child(3) td:first-child"
);
const healthCell = document.querySelector(
  ".metrics tr:nth-child(4) td:first-child"
);

if (type === "battery") {
  confidenceCell.innerText = "Battery Reliability";
  healthCell.innerText = "Battery Percentage";
}

if (type === "wifi") {
  confidenceCell.innerText = "Signal Intensity";
  healthCell.innerText = "Signal Quality";
}
  if (!type) {
    alert("Please select a sensor");
    return;
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
      const data = await fetchData(type);
      latestData = data;

      if (type === "battery") {
        lastValue = data.end_percent;
      }

      if (type === "wifi") {
        lastValue = data.signal_percent;
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

      /* ===== FINAL METRICS ===== */
      if (type === "battery") {
        let healthText = "";
        let summaryText = "";

        if (latestData.charging) {
          healthText = "Charging (Normal)";
          summaryText = "Battery is charging normally";
        } else if (latestData.delta < 0) {
          healthText = "Battery Consuming";
          summaryText = "Battery consumption detected";
        } else {
          healthText = "Stable Consumption";
          summaryText = "No abnormal battery drain detected";
        }

        document.getElementById("mStatus").innerText = healthText;
        document.getElementById("mConfidence").innerText = "Trend-based";
        document.getElementById("mHealth").innerText = healthText;

        const summary = document.getElementById("summary");
        summary.className = "summary HEALTHY";
        summary.innerText = summaryText;
        summary.classList.remove("hidden");
      }

      if (type === "wifi") {
        document.getElementById("mStatus").innerText =
          latestData.connected ? `Connected (${latestData.ssid})` : "Not Connected";
        document.getElementById("mConfidence").innerText = lastValue + "%";
        document.getElementById("mHealth").innerText =
          lastValue >= 60 ? "Good" : lastValue >= 30 ? "Moderate" : "Poor";

        const summary = document.getElementById("summary");
        summary.className = "summary " +
          (lastValue >= 60 ? "HEALTHY" : lastValue >= 30 ? "DRIFTING" : "FAULTY");
        summary.innerText =
          lastValue >= 60
            ? "WiFi signal is strong"
            : lastValue >= 30
            ? "WiFi signal is moderate"
            : "WiFi signal is weak";
        summary.classList.remove("hidden");
      }
    }
  }, 1000);
}
