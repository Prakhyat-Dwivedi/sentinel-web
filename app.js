/* ================= CONFIG ================= */
const API_BASE = "https://sensor-intelligence-api.onrender.com";
const DURATION = 10; // seconds

let chart = null;
let timer = null;

/* ================= INIT GRAPH ================= */
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Battery Level (%)",
        data: [],
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.15)",
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

  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();
}

/* ================= FETCH ================= */
async function fetchBattery() {
  const res = await fetch(`${API_BASE}/battery`);
  const data = await res.json();

  if (data.error) throw new Error(data.error);
  return data;
}

/* ================= RUN ANALYSIS ================= */
async function runAnalysis() {
  resetUI();

  const countdown = document.getElementById("countdown");
  countdown.classList.remove("hidden");

  let timeLeft = DURATION;
  let startPercent = null;
  let endPercent = null;
  let charging = false;

  clearInterval(timer);

  timer = setInterval(async () => {
    countdown.innerText = `Observing battery… ${timeLeft}s`;

    try {
      const data = await fetchBattery();

      if (startPercent === null) {
        startPercent = data.percent;
      }

      endPercent = data.percent;
      charging = data.charging;

      chart.data.labels.push(new Date().toLocaleTimeString());
      chart.data.datasets[0].data.push(endPercent);
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

      const delta = endPercent - startPercent;

      let statusText = charging
        ? "Charging (Stable)"
        : delta < 0
        ? "Normal Discharge"
        : "Stable Discharge";

      // METRICS TABLE (UPDATED AFTER GRAPH)
      document.getElementById("mStatus").innerText = statusText;
      document.getElementById("mConfidence").innerText = "Observed";
      document.getElementById("mHealth").innerText = endPercent + "%";

      // SUMMARY
      const summary = document.getElementById("summary");
      summary.classList.remove("hidden");
      summary.className = "summary HEALTHY";

      summary.innerText =
        "Battery behavior is stable during short observation window.";
    }
  }, 1000);
}
