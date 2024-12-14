// Fitbit API configuration
const FITBIT_CONFIG = {
  access_token:
    "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyM1EyRlIiLCJzdWIiOiJCWjRDUkQiLCJpc3MiOiJGaXRiaXQiLCJ0eXAiOiJhY2Nlc3NfdG9rZW4iLCJzY29wZXMiOiJyc29jIHJhY3QgcnNldCByb3h5IHJwcm8gcnNsZSByaHIgcm51dCByZWNnIiwiZXhwIjoxNzA4MjU5NTk5LCJpYXQiOjE3MDgyMzA3OTl9.mFRST_vOKmQP0q_kqHIhG9q_kqHIhG9",
};

// Update the fetchFitbitData function to use the static token
const fetchFitbitData = async (endpoint) => {
  try {
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${FITBIT_CONFIG.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
};

// Updated data fetching functions
const fetchDailySteps = async () => {
  const data = await fetchFitbitData("activities/steps/date/today/1d.json");
  return data?.["activities-steps"][0]?.value || "N/A";
};

const fetchHeartRate = async () => {
  try {
    const data = await fetchFitbitData("activities/heart/date/today/1d.json");
    console.log("Heart rate data:", data);
    if (!data || !data["activities-heart"] || !data["activities-heart"][0]) {
      console.error("Invalid heart rate data structure:", data);
      return "N/A";
    }
    return data["activities-heart"][0].value.restingHeartRate || "N/A";
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
    const data = await fetchFitbitData("sleep/date/today.json");
    console.log("Sleep data:", data);
    if (!data || !data.summary) {
      console.log("No sleep data for today, trying yesterday...");
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

// Function to update the UI
const updateFitbitStats = async () => {
  try {
    // Show loading state
    const stats = ["daily-steps", "heart-rate", "calories", "sleep-duration"];
    stats.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.innerHTML = '<span class="loading-spinner"></span>';
      }
    });

    // Fetch all stats
    const [steps, heartRate, calories, sleep] = await Promise.all([
      fetchDailySteps(),
      fetchHeartRate(),
      fetchCalories(),
      fetchSleep(),
    ]);

    console.log("All stats fetched:", { steps, heartRate, calories, sleep });

    // Update UI with results
    document.getElementById("daily-steps").textContent = steps;
    document.getElementById("heart-rate").textContent =
      heartRate !== "N/A" ? `${heartRate} bpm` : "N/A";
    document.getElementById("calories").textContent =
      calories !== "N/A" ? `${calories} cal` : "N/A";

    if (sleep && sleep.totalMinutesAsleep) {
      const hours = Math.floor(sleep.totalMinutesAsleep / 60);
      const minutes = sleep.totalMinutesAsleep % 60;
      document.getElementById(
        "sleep-duration"
      ).textContent = `${hours}h ${minutes}m`;
    } else {
      document.getElementById("sleep-duration").textContent = "N/A";
    }
  } catch (error) {
    console.error("Error updating stats:", error);
    stats.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = "Error";
      }
    });
  }
};

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", () => {
  // Show loading state
  document.querySelectorAll(".stat-info p").forEach((p) => {
    p.innerHTML = '<span class="loading-spinner"></span>';
  });

  // Fetch and display stats immediately
  updateFitbitStats();

  // Update every 5 minutes
  setInterval(updateFitbitStats, 300000);
});

// Remove the Initialize Fitbit Access button from the UI
const adminSection = document.querySelector(".admin-section");
if (adminSection) {
  adminSection.remove();
}
