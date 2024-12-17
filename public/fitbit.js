// Base fetch function
const fetchFitbitData = async (endpoint) => {
  console.log("Attempting to fetch:", endpoint);
  try {
    const response = await fetch(
      `/.netlify/functions/fitbit-fetch?endpoint=${encodeURIComponent(
        endpoint
      )}`
    );
    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Data received:", data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

// Single source of truth for fetch functions
const fetchSteps = async () => {
  const data = await fetchFitbitData("activities/steps/date/today/1d.json");
  return data["activities-steps"][0].value;
};

const fetchHeartRate = async () => {
  const data = await fetchFitbitData("activities/heart/date/today/1d.json");
  return `${data["activities-heart"][0].value.restingHeartRate || "0"} bpm`;
};

const fetchCalories = async () => {
  const data = await fetchFitbitData("activities/calories/date/today/1d.json");
  return `${data["activities-calories"][0].value} cal`;
};

const fetchTodayDistance = async () => {
  const data = await fetchFitbitData("activities/distance/date/today/1d.json");
  return `${parseFloat(data["activities-distance"][0].value).toFixed(2)} km`;
};

const fetchTotalDistance = async () => {
  const startDate = "2023-12-15";
  const today = new Date().toISOString().split("T")[0];
  const data = await fetchFitbitData(
    `activities/distance/date/${startDate}/${today}.json`
  );
  const total = data["activities-distance"]
    .reduce((sum, day) => sum + parseFloat(day.value), 0)
    .toFixed(2);
  return `${total} km`;
};

const fetchSleepData = async () => {
  const data = await fetchFitbitData("sleep/date/today.json");
  if (data.summary?.totalMinutesAsleep) {
    const hours = Math.floor(data.summary.totalMinutesAsleep / 60);
    const minutes = data.summary.totalMinutesAsleep % 60;
    return `${hours}h ${minutes}m`;
  }
  return "No sleep data";
};

const fetchActivityTrends = async () => {
  try {
    // Get data for the last 7 days
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Fetch steps and active minutes
    const stepsData = await fetchFitbitData(
      `activities/steps/date/${startDate}/${endDate}.json`
    );
    const activeMinutesData = await fetchFitbitData(
      `activities/minutesVeryActive/date/${startDate}/${endDate}.json`
    );

    // Format data for chart
    const chartData = {
      steps: stepsData["activities-steps"].map((day) => ({
        date: new Date(day.dateTime).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        value: parseInt(day.value),
      })),
      activeMinutes: activeMinutesData["activities-minutesVeryActive"].map(
        (day) => ({
          date: new Date(day.dateTime).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          value: parseInt(day.value),
        })
      ),
    };

    // Create the chart
    renderActivityChart(chartData);
  } catch (error) {
    console.error("Error fetching activity trends:", error);
  }
};

const fetchHealthSummary = async () => {
  try {
    // Get today's data
    const stepsData = await fetchFitbitData(
      "activities/steps/date/today/1d.json"
    );
    const caloriesData = await fetchFitbitData(
      "activities/calories/date/today/1d.json"
    );
    const activeMinutesData = await fetchFitbitData(
      "activities/minutesVeryActive/date/today/1d.json"
    );

    // Calculate metrics
    const steps = parseInt(stepsData["activities-steps"][0].value);
    const calories = parseInt(caloriesData["activities-calories"][0].value);
    const activeMinutes = parseInt(
      activeMinutesData["activities-minutesVeryActive"][0].value
    );

    // Calculate derived metrics
    const calPerStep = ((calories / steps) * 100).toFixed(1);
    const activeTimePercentage = ((activeMinutes / 1440) * 100).toFixed(1);

    // Update the health summary section using IDs
    document.getElementById(
      "calories-per-step"
    ).textContent = `${calPerStep} cal/100 steps`;
    document.getElementById(
      "daily-rhythm"
    ).textContent = `Daily Rhythm: ${activeTimePercentage}%`;
    document.getElementById(
      "active-time"
    ).textContent = `${activeTimePercentage}% active time`;
  } catch (error) {
    console.error("Error fetching health summary:", error);
  }
};

// Add this function to render the activity chart
const renderActivityChart = (data) => {
  const ctx = document.getElementById("activity-chart").getContext("2d");

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "rgba(255, 255, 255, 0.7)",
          padding: 20,
        },
      },
    },
    scales: {
      y: {
        type: "linear",
        position: "left",
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          padding: 10,
        },
      },
      y1: {
        type: "linear",
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          padding: 10,
        },
      },
      x: {
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          padding: 10,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };

  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.steps.map((d) => d.date),
      datasets: [
        {
          label: "Steps",
          data: data.steps.map((d) => d.value),
          borderColor: "#1DB954",
          tension: 0.4,
          yAxisID: "y",
        },
        {
          label: "Active Minutes",
          data: data.activeMinutes.map((d) => d.value),
          borderColor: "#4CAF50",
          tension: 0.4,
          yAxisID: "y1",
        },
      ],
    },
    options: chartOptions,
  });
};

// Initialize dashboard
const initializeDashboard = async () => {
  console.log("Starting dashboard initialization");

  // First update the basic metrics
  const metrics = [
    { id: "daily-steps", fetch: fetchSteps },
    { id: "heart-rate", fetch: fetchHeartRate },
    { id: "active-calories", fetch: fetchCalories },
    { id: "sleep-duration", fetch: fetchSleepData },
    { id: "total-distance", fetch: fetchTotalDistance },
    { id: "todays-distance", fetch: fetchTodayDistance },
  ];

  // Handle basic metrics
  for (const metric of metrics) {
    try {
      console.log(`Fetching ${metric.id}...`);
      const element = document.getElementById(metric.id);
      if (element) {
        const value = await metric.fetch();
        console.log(`${metric.id} value:`, value);
        element.textContent = value;
      }
    } catch (error) {
      console.error(`Error updating ${metric.id}:`, error);
    }
  }

  // Then update the summary and trends
  try {
    await Promise.all([fetchHealthSummary(), fetchActivityTrends()]);
  } catch (error) {
    console.error("Error updating summary or trends:", error);
  }
};

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing dashboard...");
  initializeDashboard();
});
