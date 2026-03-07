const API_URL = "/api/sensors/history?limit=100";

const urlParams = new URLSearchParams(window.location.search);
// default to temperature in case someone goes directly to the page
const metric = urlParams.get("metric") || "temperature";

// update page titles
const titleElement = document.getElementById("log-title");
const headerElement = document.getElementById("metric-header");

if (metric === "temperature") {
    titleElement.textContent = "Temperature History";
    headerElement.textContent = "Temperature (°F)";
} else if (metric === "ph") {
    titleElement.textContent = "pH Level History";
    headerElement.textContent = "pH Level";
} else if (metric === "tds") {
    titleElement.textContent = "TDS History";
    headerElement.textContent = "TDS (ppm)";
}

// fetch data and build the table
async function fetchLogs() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch logs");

        const data = await response.json();
        const tableBody = document.getElementById("log-table-body");

        // clear old data
        tableBody.innerHTML = "";

        // loop through history data and create the table
        data.forEach((reading) => {
            const row = document.createElement("tr");
            const date = new Date(reading.timestamp);
            const timeString = date.toLocaleString();

            let value = reading[metric];

            // format the numbers
            if (metric === "temperature" || metric === "ph") {
                value = value.toFixed(1);
            } else if (metric === "tds") {
                value = Math.round(value);
            }

            // create the HTML for the row
            row.innerHTML = `
                <td>${timeString}</td>
                <td><strong>${value}</strong></td>
            `;

            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading logs:", error);
        document.getElementById("log-title").textContent =
            "Error loading logs.";
    }
}

fetchLogs();
