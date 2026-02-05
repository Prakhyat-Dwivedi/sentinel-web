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
        label: "Battery Level (%)",
        data: [],
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.15)",
        tension: 0.3,
        fill: true,
        pointRadius: 3
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
          title: { display: true, text: "Battery %" }
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
async function fetchBattery() {
  const res = await fetch(`${API_BASE}/battery`);
  const data = await res.json();

  if (!data.available) {
    throw new Error("Battery data not available");
  }
  return data;
}

/* ================= RUN ANALYSIS ================= */
async function runAnalysis() {
  const type = document.getElementById("sensorType").value;
  if (type !== "battery") {
    alert("Select Battery Health for this analysis");
    return;
  }

  resetUI();

  const countdown = document.getElementById("countdown");
  countdown.classList.remove("hidden");

  let timeLeft = DURATION;
  let startPercent = null;
  let lastPercent = null;
  let chargingState = false;

  clearInterval(timer);

  timer = setInterval(async () => {
    countdown.innerText = `Analyzing… ${timeLeft}s`;

    try {
      const data = await fetchBattery();

      lastPercent = data.percent;
      chargingState = data.charging;

      if (startPercent === null) {
        startPercent = data.percent;
      }

      chart.data.labels.push(new Date().toLocaleTimeString());
      chart.data.datasets[0].data.push(data.percent);
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

      const delta = lastPercent - startPercent;

      // TABLE UPDATE
      document.getElementById("mStatus").innerText =
        chargingState ? "Charging" : delta < 0 ? "Discharging" : "Stable";

      document.getElementById("mConfidence").innerText =
        Math.abs(delta) + "% change";

      document.getElementById("mHealth").innerText =
        chargingState
          ? "Charging"
          : delta < 0
          ? "Battery Consumption"
          : "Stable Level";

      // SUMMARY
      const summary = document.getElementById("summary");
      summary.classList.remove("hidden");

      if (chargingState) {
        summary.className = "summary HEALTHY";
        summary.innerText = "Charging detected — battery level stable";
      } else if (delta < 0) {
        summary.className = "summary DRIFTING";
        summary.innerText = "Battery discharging observed in short window";
      } else {
        summary.className = "summary HEALTHY";
        summary.innerText = "Battery level stable in short observation window";
      }
    }
  }, 1000);
}
