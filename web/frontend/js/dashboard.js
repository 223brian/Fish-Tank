const API_URL = "/api/sensors/latest";

async function fetchLatestData() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Received data:", data);

        // used toFixed to make sure there is always one decimal place (e.g. 78.0 instead of 78)
        document.getElementById("temp").textContent =
            data.temperature.toFixed(1);
        document.getElementById("ph").textContent = data.ph.toFixed(1);

        // TDS is a whole number, so no decimal is needed
        document.getElementById("tds").textContent = Math.round(data.tds);

        // update status indicators
        // Temp: Optimal (74-80), Warning (70-84), Critical (<70 or >84)
        updateStatus("temp", data.temperature, 74, 80, 70, 84);

        // pH: Optimal (6.8-7.6), Warning (6.4-8.0), Critical (<6.4 or >8.0)
        updateStatus("ph", data.ph, 6.8, 7.6, 6.4, 8.0);

        // TDS: Optimal (100-300), Warning (50-400), Critical (<50 or >400)
        updateStatus("tds", data.tds, 100, 300, 50, 400);
    } catch (error) {
        console.error("Failed to fetch data:", error);
    }
}

function updateStatus(
    sensorType,
    value,
    minOptimal,
    maxOptimal,
    minWarning,
    maxWarning,
) {
    const dotElement = document.getElementById(`${sensorType}-dot`);
    const textElement = document.getElementById(`${sensorType}-text`);

    dotElement.classList.remove("optimal", "warning", "critical", "loading");

    if (value >= minOptimal && value <= maxOptimal) {
        dotElement.classList.add("optimal");
        textElement.textContent = "Status: Optimal";
    } else if (value >= minWarning && value <= maxWarning) {
        dotElement.classList.add("warning");
        textElement.textContent =
            value < minOptimal
                ? "Status: Warning - Too Low"
                : "Status: Warning - Too High";
    } else {
        dotElement.classList.add("critical");
        textElement.textContent =
            value < minWarning
                ? "Status: Critical - Too Low"
                : "Status: Critical - Too High";
    }
}

fetchLatestData();

// refresh data every minute
setInterval(fetchLatestData, 60000);
