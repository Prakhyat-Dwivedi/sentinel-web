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
  let lastValue = null;
  let statusText = "";

  clearInterval(timer);

  timer = setInterval(async () => {
    if (type === "battery") {
      countdown.innerText = `Observing battery consumption… ${timeLeft}s`;
    } else {
      countdown.innerText = `Observing WiFi signal quality… ${timeLeft}s`;
    }

    try {
      const data = await fetchData(type);

      // ---------- BATTERY ----------
      if (type === "battery" && data.available === true) {
        lastValue = Number(data.percent);
        statusText = data.charging ? "Charging" : "Discharging";
      }

      // ---------- WIFI ----------
      if (type === "wifi" && data.connected === true) {
        lastValue = Number(data.signal_percent);
        statusText = `Connected to ${data.ssid}`;
      }

      // ❗ DO NOT PLOT INVALID VALUES
      if (typeof lastValue === "number" && !isNaN(lastValue)) {
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(lastValue);
        chart.update();
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

      // FINAL METRICS
      document.getElementById("mStatus").innerText = statusText;
      document.getElementById("mConfidence").innerText = lastValue + "%";
      document.getElementById("mHealth").innerText =
        lastValue >= 70 ? "Healthy" :
        lastValue >= 40 ? "Warning" :
        "Critical";

      // SUMMARY
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
        summary.innerText = "Critical condition detected";
      }
    }
  }, 1000);
}
