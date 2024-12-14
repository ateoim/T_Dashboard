// Fitbit API configuration
const FITBIT_CONFIG = {
  access_token:
    "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyM1EyRlIiLCJzdWIiOiJCNFY4RzgiLCJpc3MiOiJGaXRiaXQiLCJ0eXAiOiJhY2Nlc3NfdG9rZW4iLCJzY29wZXMiOiJyc29jIHJlY2cgcnNldCByaXJuIHJveHkgcm51dCBycHJvIHJzbGUgcmNmIHJhY3QgcmxvYyBycmVzIHJ3ZWkgcmhyIHJ0ZW0iLCJleHAiOjE3MzQyMDY5MDEsImlhdCI6MTczNDE3ODEwMX0.IZNTJMVN9w0ghrPrw0zE7mlNg50SsooyzhX2DGGP8Q8",
};

// Add rate limiting and caching
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

const fetchFitbitData = async (endpoint) => {
  try {
    // Check cache first
    const cachedData = cache.get(endpoint);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
    lastRequestTime = Date.now();

    const response = await fetch(
      `https://api.fitbit.com/1/user/-/${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${FITBIT_CONFIG.access_token}`,
        },
      }
    );

    if (response.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = response.headers.get("Retry-After") || 1;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return fetchFitbitData(endpoint);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
    // Return cached data if available, even if expired
    const cachedData = cache.get(endpoint);
    return cachedData ? cachedData.data : null;
  }
};

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
const updateHealthSummary = async () => {
  try {
    // Fetch active minutes
    const activeData = await fetchFitbitData(
      "activities/minutesVeryActive/date/today/1d.json"
    );
    const activeMinutes =
      activeData?.["activities-minutesVeryActive"][0]?.value || 0;

    // Calculate step goal progress (assuming 10,000 step goal)
    const steps = await fetchDailySteps();
    const stepProgress = ((parseInt(steps) / 10000) * 100).toFixed(0);

    // Get sleep quality if available
    const sleep = await fetchSleep();
    const sleepEfficiency = sleep?.efficiency || "N/A";

    // Update the summary elements
    document.getElementById(
      "step-goal-progress"
    ).textContent = `${stepProgress}% of daily goal`;
    document.getElementById("sleep-quality").textContent =
      sleepEfficiency !== "N/A"
        ? `${sleepEfficiency}% sleep quality`
        : "No sleep data";
    document.getElementById(
      "active-minutes"
    ).textContent = `${activeMinutes} active minutes`;
  } catch (error) {
    console.error("Error updating health summary:", error);
  }
};

// Update the initialization to fetch data sequentially
const initializeDashboard = async () => {
  try {
    // Fetch data one at a time to avoid rate limits
    const steps = await fetchDailySteps();
    const heartRate = await fetchHeartRate();
    const calories = await fetchCalories();
    const sleep = await fetchSleep();
    const distance = await fetchDailyDistance();
    const totalDistance = await fetchCumulativeDistance();

    // Update UI
    updateUI({ steps, heartRate, calories, sleep, distance, totalDistance });

    // Update health summary after main stats
    await updateHealthSummary();
  } catch (error) {
    console.error("Error initializing dashboard:", error);
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

// Update initialization
document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
  // Update every 5 minutes
  setInterval(initializeDashboard, 300000);
});

// Remove the Initialize Fitbit Access button from the UI
const adminSection = document.querySelector(".admin-section");
if (adminSection) {
  adminSection.remove();
}
