const API_BASE = "https://sensor-intelligence-api.onrender.com";
const DURATION = 10;

let chart;
let timer;
let timeLeft;

/* ---------- INIT GRAPH ---------- */
window.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("chart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Sensor Value (%)",
        data: [],
        borderColor: "#2563eb",
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { title: { display: true, text: "Time" }},
        y: { min: 0, max: 100, title: { display: true, text: "Value (%)" }}
      }
    }
  });
});

/* ---------- RESET ---------- */
function resetUI() {
  document.getElementById("mStatus").innerText = "–";
  document.getElementById("mConfidence").innerText = "–";
  document.getElementById("mHealth").innerText = "–";
  document.getElementById("summary").classList.add("hidden");

  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();

  clearInterval(timer);
}

/* ---------- FETCH ---------- */
async function fetchData(type) {
  const res = await fetch(`${API_BASE}/${type}`);
  return res.json();
}

/* ---------- RUN ANALYSIS ---------- */
async function runAnalysis() {
  const type = document.getElementById("sensorType").value;
  if (!type) return alert("Select a sensor");

  resetUI();

  const countdown = document.getElementById("countdown");
  countdown.classList.remove("hidden");

  timeLeft = DURATION;
  let samples = [];
  let statusText = "";

  timer = setInterval(async () => {
    countdown.innerText = `Analyzing… ${timeLeft}s`;

    const data = await fetchData(type);
    let value = 0;

    if (type === "battery") {
      value = data.percent;
      statusText = data.charging ? "Charging" : "Discharging";
    }

    if (type === "wifi") {
      value = data.signal_percent;
      statusText = `Connected (${data.ssid})`;
    }

    samples.push(value);

    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(value);
    chart.update();

    timeLeft--;

    if (timeLeft === 0) {
      clearInterval(timer);
      countdown.classList.add("hidden");

      const avg = Math.round(
        samples.reduce((a, b) => a + b, 0) / samples.length
      );

      document.getElementById("mStatus").innerText = statusText;
      document.getElementById("mConfidence").innerText = avg + "%";
      document.getElementById("mHealth").innerText =
        avg >= 70 ? "Healthy" : avg >= 40 ? "Warning" : "Critical";

      const summary = document.getElementById("summary");
      summary.classList.remove("hidden");
      summary.className =
        "summary " + (avg >= 70 ? "HEALTHY" : avg >= 40 ? "WARNING" : "CRITICAL");

      summary.innerText =
        avg >= 70
          ? "System operating normally"
          : avg >= 40
          ? "Moderate degradation detected"
          : "Poor condition detected";
    }
  }, 1000);
}
