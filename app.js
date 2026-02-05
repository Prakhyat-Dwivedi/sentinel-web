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
  if (!type) {
    alert("Please select a sensor");
    return;
  }

  resetUI();

  const countdown = document.getElementById("countdown");
  countdown.classList.remove("hidden");

  let timeLeft = DURATION;
  let lastValue = 0;
  let statusText = "";

  clearInterval(timer);

  timer = setInterval(async () => {
    countdown.innerText = `Analyzing… ${timeLeft}s`;

    try {
      const data = await fetchData(type);

      if (type === "battery") {
        lastValue = data.end_percent;
        statusText = data.charging ? "Charging" : "Discharging";
      }

      if (type === "wifi") {
        lastValue = data.signal_percent;
        statusText = data.connected
          ? `Connected (${data.ssid})`
          : "Not connected";
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

      document.getElementById("mStatus").innerText = statusText;
      document.getElementById("mConfidence").innerText = lastValue + "%";
      document.getElementById("mHealth").innerText =
        lastValue >= 70 ? "Healthy" :
        lastValue >= 40 ? "Warning" :
        "Critical";

      const summary = document.getElementById("summary");
      summary.classList.remove("hidden");

      if (lastValue >= 70) {
        summary.className = "summary HEALTHY";
        summary.innerText = "System operating normally";
      } else if (lastValue >= 40) {
        summary.className = "summary DRIFTING";
        summary.innerText = "Moderate degradation detected";
      } else {
        summary.className = "summary FAULTY";
        summary.innerText = "Poor condition detected";
      }
    }
  }, 1000);
}
