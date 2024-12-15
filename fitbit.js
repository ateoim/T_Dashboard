// Fitbit API configuration
// const FITBIT_CONFIG = {
//   access_token: "your_access_token",
// };

// Add rate limiting and caching
const cache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 2000; // Increase to 2 seconds between requests

// Update the base URL to point to the Netlify function
const backendBaseUrl = "/.netlify/functions/fitbit-fetch";

// Add rate limiting state
let requestQueue = Promise.resolve();

// Add rate limit handling
let rateLimitReset = 0;

// Modify fetchFitbitData to handle rate limits
async function fetchFitbitData(endpoint) {
  // Check if we're rate limited
  if (Date.now() < rateLimitReset) {
    console.log(
      `Rate limited, waiting ${Math.ceil(
        (rateLimitReset - Date.now()) / 1000
      )} seconds`
    );
    const cachedData = cache.get(endpoint);
    return cachedData?.data || null;
  }

  // Check cache first
  const cachedData = cache.get(endpoint);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    const response = await fetch(
      `${backendBaseUrl}?endpoint=${encodeURIComponent(endpoint)}`
    );

    if (response.status === 429) {
      // Get reset time from headers
      const resetSeconds = parseInt(
        response.headers.get("fitbit-rate-limit-reset") || "3600"
      );
      rateLimitReset = Date.now() + resetSeconds * 1000;
      console.log(`Rate limited, will reset in ${resetSeconds} seconds`);
      return cachedData?.data || null;
    }

    if (!response.ok) {
      console.error(`Error fetching ${endpoint}:`, response.statusText);
      return cachedData?.data || null;
    }

    const data = await response.json();

    // Cache the response
    cache.set(endpoint, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return cachedData?.data || null;
  }
}

// Add a delay between requests to avoid rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Updated data fetching functions
const fetchDailySteps = async () => {
  const data = await fetchFitbitData("activities/steps/date/today/1d.json");
  return data?.["activities-steps"][0]?.value || "N/A";
};

const fetchHeartRate = async () => {
  try {
    // Use the resting heart rate endpoint instead
    const data = await fetchFitbitData("activities/heart/date/today/1d.json");
    console.log("Heart rate data:", data);

    // Get the resting heart rate for today
    const restingHR = data["activities-heart"][0]?.value?.restingHeartRate;
    return restingHR || "N/A";
  } catch (error) {
    console.error("Error in fetchHeartRate:", error);
    return "N/A";
  }
};

const fetchCalories = async () => {
  try {
    const data = await fetchFitbitData(
      "activities/calories/date/today/1d.json"
    );
    console.log("Calories data:", data);
    if (
      !data ||
      !data["activities-calories"] ||
      !data["activities-calories"][0]
    ) {
      console.error("Invalid calories data structure:", data);
      return "N/A";
    }
    return data["activities-calories"][0].value || "N/A";
  } catch (error) {
    console.error("Error in fetchCalories:", error);
    return "N/A";
  }
};

const fetchSleep = async () => {
  try {
    // Try to get today's sleep first
    const today = new Date().toISOString().split("T")[0];
    const data = await fetchFitbitData(`sleep/date/${today}.json`);
    console.log("Sleep data:", data);

    // If no sleep data for today, try yesterday
    if (!data?.summary?.totalMinutesAsleep) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];
      const yesterdayData = await fetchFitbitData(`sleep/date/${dateStr}.json`);
      console.log("Yesterday's sleep data:", yesterdayData);
      return yesterdayData?.summary || null;
    }

    return data.summary;
  } catch (error) {
    console.error("Error in fetchSleep:", error);
    return null;
  }
};

// Add these new functions to fetch distance data
const fetchDailyDistance = async () => {
  try {
    const data = await fetchFitbitData(
      "activities/distance/date/today/1d.json"
    );
    return data?.["activities-distance"][0]?.value || "N/A";
  } catch (error) {
    console.error("Error fetching daily distance:", error);
    return "N/A";
  }
};

const fetchCumulativeDistance = async () => {
  try {
    const today = new Date();
    let startDate;
    let titleText;

    // If we're in 2025 or later, track from start of the year
    if (today.getFullYear() >= 2025) {
      startDate = `${today.getFullYear()}-01-01`;
      titleText = `Total Distance ${today.getFullYear()}`;
    } else {
      startDate = "2024-12-15";
      titleText = "Total Distance (since Dec 15)";
    }

    const todayStr = today.toISOString().split("T")[0];
    const data = await fetchFitbitData(
      `activities/distance/date/${startDate}/${todayStr}.json`
    );

    // Sum up all distances
    const totalDistance = data["activities-distance"].reduce(
      (sum, day) => sum + parseFloat(day.value),
      0
    );

    // Format current time
    const lastUpdated = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Update the value, title, and timestamp
    const totalDistanceElement = document.getElementById("total-distance");
    if (totalDistanceElement) {
      totalDistanceElement.textContent = `${totalDistance.toFixed(2)} km`;
    }

    const totalDistanceTitleElement = document.getElementById(
      "total-distance-title"
    );
    if (totalDistanceTitleElement) {
      totalDistanceTitleElement.textContent = titleText;
    }

    const lastUpdatedElement = document.getElementById("last-updated");
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = `Last updated: ${lastUpdated}`;
    }

    return totalDistance.toFixed(2);
  } catch (error) {
    console.error("Error fetching cumulative distance:", error);
    return "N/A";
  }
};

// Add this function to fetch and update the summary data
const updateHealthSummary = async (data) => {
  try {
    const steps = data.steps?.["activities-steps"]?.[0]?.value || "N/A";
    const calories =
      data.calories?.["activities-calories"]?.[0]?.value || "N/A";
    const activeMinutes = await fetchActiveMinutes();
    const sleep = data.sleep;
    const heartRate =
      data.heartRate?.["activities-heart"]?.[0]?.value?.restingHeartRate ||
      "N/A";

    // Calculate Energy Efficiency
    const energyEfficiency =
      steps !== "N/A" && calories !== "N/A"
        ? ((parseInt(calories) / parseInt(steps)) * 100).toFixed(1)
        : "N/A";

    // Calculate Daily Rhythm Score
    const sleepHours = sleep?.totalMinutesAsleep
      ? sleep.totalMinutesAsleep / 60
      : 0;
    const rhythmScore = (
      (sleepHours / 8) * 50 +
      (parseInt(activeMinutes) / 30) * 30 +
      ((70 - Math.abs(70 - parseInt(heartRate))) / 70) * 20
    ).toFixed(0);

    // Calculate Movement Consistency
    const awakeMinutes = 24 * 60 - (sleep?.totalMinutesAsleep || 0);
    const consistencyScore = (
      (parseInt(activeMinutes) / awakeMinutes) *
      100
    ).toFixed(1);

    // Update the summary elements
    document.getElementById(
      "energy-efficiency"
    ).textContent = `${energyEfficiency} cal/100 steps`;

    document.getElementById(
      "rhythm-score"
    ).textContent = `Daily Rhythm: ${rhythmScore}%`;

    document.getElementById(
      "movement-consistency"
    ).textContent = `${consistencyScore}% active time`;
  } catch (error) {
    console.error("Error updating health summary:", error);
  }
};

// Add this function to fetch 7-day activity history
const fetchActivityHistory = async () => {
  try {
    const today = new Date();
    const dates = [];
    const stepsData = [];
    const activeMinutesData = [];

    // Get data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dates.push(date.toLocaleDateString("en-US", { weekday: "short" }));

      // Fetch steps
      const stepsResponse = await fetchFitbitData(
        `activities/steps/date/${dateStr}/1d.json`
      );
      stepsData.push(parseInt(stepsResponse["activities-steps"][0].value));

      // Fetch active minutes
      const activeResponse = await fetchFitbitData(
        `activities/minutesVeryActive/date/${dateStr}/1d.json`
      );
      activeMinutesData.push(
        parseInt(activeResponse["activities-minutesVeryActive"][0].value)
      );
    }

    return { dates, stepsData, activeMinutesData };
  } catch (error) {
    console.error("Error fetching activity history:", error);
    return null;
  }
};

// Add this function to create and update the chart
const updateActivityChart = async () => {
  try {
    const data = await fetchActivityHistory();
    if (!data) return;

    const canvas = document.getElementById("activityChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check if Chart is available
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded");
      return;
    }

    // Safely destroy existing chart
    if (
      window.activityChart &&
      typeof window.activityChart.destroy === "function"
    ) {
      window.activityChart.destroy();
    }

    window.activityChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.dates,
        datasets: [
          {
            label: "Steps",
            data: data.stepsData,
            borderColor: "#1db954",
            backgroundColor: "rgba(29, 185, 84, 0.1)",
            tension: 0.4,
            fill: true,
            yAxisID: "y",
          },
          {
            label: "Active Minutes",
            data: data.activeMinutesData,
            borderColor: "#1ed760",
            backgroundColor: "rgba(30, 215, 96, 0.1)",
            tension: 0.4,
            fill: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "#b3b3b3",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: "#b3b3b3",
            },
          },
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "#b3b3b3",
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: "#ffffff",
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error updating activity chart:", error);
  }
};

function updateLoadingState(isLoading) {
  const elements = document.querySelectorAll(".stat-value");
  elements.forEach((element) => {
    if (isLoading) {
      element.classList.add("loading");
    } else {
      element.classList.remove("loading");
    }
  });
}

// Add these constants at the top
const ENDPOINTS = {
  steps: "activities/steps/date/today/1d.json",
  heart: "activities/heart/date/today/1d.json",
  calories: "activities/calories/date/today/1d.json",
  sleep: "sleep/date/2024-12-15.json",
  distance: "activities/distance/date/today/1d.json",
};

// Update initializeDashboard to be more efficient
const initializeDashboard = async () => {
  try {
    updateLoadingState(true);
    let data = {};

    // First, try to get all data from cache
    Object.entries(ENDPOINTS).forEach(([key, endpoint]) => {
      const cachedData = cache.get(endpoint);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        data[key] = cachedData.data;
      }
    });

    // If we're not rate limited, fetch missing data
    if (Date.now() >= rateLimitReset) {
      for (const [key, endpoint] of Object.entries(ENDPOINTS)) {
        // Only fetch if we don't have cached data
        if (!data[key]) {
          const result = await fetchFitbitData(endpoint);
          if (result) {
            data[key] = result;
            // Cache the result
            cache.set(endpoint, {
              data: result,
              timestamp: Date.now(),
            });
          }
          // Wait longer between requests
          await delay(3000);
        }
      }
    }

    // Update UI with whatever data we have
    updateUI({
      steps: data.steps?.["activities-steps"]?.[0]?.value || "N/A",
      heartRate:
        data.heart?.["activities-heart"]?.[0]?.value?.restingHeartRate || "N/A",
      calories: data.calories?.["activities-calories"]?.[0]?.value || "N/A",
      sleep: data.sleep,
      distance: data.distance?.["activities-distance"]?.[0]?.value || "N/A",
    });

    // Only update health summary and chart if we have all data and aren't rate limited
    if (
      Date.now() >= rateLimitReset &&
      Object.keys(data).length === Object.keys(ENDPOINTS).length
    ) {
      await updateHealthSummary(data);

      const shouldUpdateChart =
        !window.lastChartUpdate ||
        Date.now() - window.lastChartUpdate > 60 * 60 * 1000;

      if (shouldUpdateChart) {
        await updateActivityChart();
        window.lastChartUpdate = Date.now();
      }
    }
  } catch (error) {
    console.error("Error initializing dashboard:", error);
  } finally {
    updateLoadingState(false);
  }
};

// Separate UI updates from data fetching
const updateUI = (stats) => {
  const { steps, heartRate, calories, sleep, distance, totalDistance } = stats;

  // Update last update timestamp first
  const lastUpdate = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const lastUpdateElement = document.getElementById("last-data-update");
  if (lastUpdateElement) {
    lastUpdateElement.textContent = `Last updated: ${lastUpdate}`;
  }

  // Update each element if it exists
  const elements = {
    "daily-steps": steps,
    "heart-rate": heartRate !== "N/A" ? `${heartRate} bpm` : "N/A",
    calories: calories !== "N/A" ? `${calories} cal` : "N/A",
    "daily-distance": distance !== "N/A" ? `${distance} km` : "N/A",
    "total-distance": totalDistance !== "N/A" ? `${totalDistance} km` : "N/A",
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });

  // Update sleep separately due to different format
  const sleepElement = document.getElementById("sleep-duration");
  if (sleepElement && sleep && sleep.totalMinutesAsleep) {
    const hours = Math.floor(sleep.totalMinutesAsleep / 60);
    const minutes = sleep.totalMinutesAsleep % 60;
    sleepElement.textContent = `${hours}h ${minutes}m`;
  } else if (sleepElement) {
    sleepElement.textContent = "N/A";
  }
};

// Update less frequently
document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
  // Update every hour
  setInterval(initializeDashboard, 3600000);
});

// Remove the Initialize Fitbit Access button from the UI
const adminSection = document.querySelector(".admin-section");
if (adminSection) {
  adminSection.remove();
}

const fetchActiveMinutes = async () => {
  try {
    const data = await fetchFitbitData(
      "activities/minutesVeryActive/date/today/1d.json"
    );
    return data?.["activities-minutesVeryActive"][0]?.value || "0";
  } catch (error) {
    console.error("Error fetching active minutes:", error);
    return "0";
  }
};
