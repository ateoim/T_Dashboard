// Fitbit API configuration
const FITBIT_CONFIG = {
  client_id: "23Q2FR",
  client_secret: "fdcc3d81a7ca67f6a46e578e2d022b25",
  redirect_uri: "https://ateoim.github.io/T_Dashboard/fitbit.html",
  auth_endpoint: "https://www.fitbit.com/oauth2/authorize",
  token_endpoint: "https://api.fitbit.com/oauth2/token",
};

let accessToken = null;
let refreshToken = null;

// Add these functions at the beginning of fitbit.js
const initiateOAuth = () => {
  // Generate a random state value for security
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem("oauth_state", state);

  // Construct the authorization URL
  const authUrl = new URL(FITBIT_CONFIG.auth_endpoint);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", FITBIT_CONFIG.client_id);
  authUrl.searchParams.append("redirect_uri", FITBIT_CONFIG.redirect_uri);
  authUrl.searchParams.append("scope", "activity heartrate sleep");
  authUrl.searchParams.append("state", state);

  // Redirect to Fitbit's authorization page
  window.location.href = authUrl.toString();
};

// Function to handle the initial token exchange
const handleAuthCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");
  const savedState = localStorage.getItem("oauth_state");

  if (!code) return;
  if (state !== savedState) {
    console.error("State mismatch - possible CSRF attack");
    return;
  }

  try {
    const basicAuth = btoa(
      `${FITBIT_CONFIG.client_id}:${FITBIT_CONFIG.client_secret}`
    );
    const response = await fetch(FITBIT_CONFIG.token_endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${FITBIT_CONFIG.redirect_uri}`,
    });

    if (!response.ok) {
      throw new Error("Token exchange failed");
    }

    const data = await response.json();
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    localStorage.setItem("fitbit_refresh_token", refreshToken);

    // Clear the URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);

    // Initialize the dashboard
    updateFitbitStats();
    setInterval(updateFitbitStats, 300000);
  } catch (error) {
    console.error("Error exchanging code for token:", error);
  }
};

// Function to handle token refresh
const refreshAccessToken = async () => {
  try {
    const basicAuth = btoa(
      `${FITBIT_CONFIG.client_id}:${FITBIT_CONFIG.client_secret}`
    );
    const response = await fetch(FITBIT_CONFIG.token_endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    accessToken = data.access_token;
    refreshToken = data.refresh_token;

    // Store new tokens
    localStorage.setItem("fitbit_refresh_token", refreshToken);

    return accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

// Function to make authenticated API calls
const fetchFitbitData = async (endpoint) => {
  try {
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      // Token expired, refresh and retry
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error("Token refresh failed");

      // Retry the request with new token
      return fetchFitbitData(endpoint);
    }

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
  const data = await fetchFitbitData("activities/heart/date/today/1d.json");
  return data?.["activities-heart"][0]?.value?.restingHeartRate || "N/A";
};

const fetchCalories = async () => {
  const data = await fetchFitbitData("activities/calories/date/today/1d.json");
  return data?.["activities-calories"][0]?.value || "N/A";
};

const fetchSleep = async () => {
  const data = await fetchFitbitData("sleep/date/today.json");
  return data?.summary || null;
};

// Function to update the UI
const updateFitbitStats = async () => {
  // Show loading state
  document.querySelectorAll(".stat-info p").forEach((p) => {
    p.innerHTML = '<span class="loading-spinner"></span>';
  });

  // Update each stat
  const steps = await fetchDailySteps();
  document.getElementById("daily-steps").textContent = steps;

  const heartRate = await fetchHeartRate();
  document.getElementById("heart-rate").textContent =
    heartRate !== "N/A" ? `${heartRate} bpm` : "N/A";

  const calories = await fetchCalories();
  document.getElementById("calories").textContent =
    calories !== "N/A" ? `${calories} cal` : "N/A";

  const sleep = await fetchSleep();
  if (sleep && sleep.totalMinutesAsleep) {
    const hours = Math.floor(sleep.totalMinutesAsleep / 60);
    const minutes = sleep.totalMinutesAsleep % 60;
    document.getElementById(
      "sleep-duration"
    ).textContent = `${hours}h ${minutes}m`;
  } else {
    document.getElementById("sleep-duration").textContent = "N/A";
  }
};

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're handling an OAuth callback
  if (window.location.search.includes("code=")) {
    handleAuthCallback();
    return;
  }

  // Check for existing refresh token
  refreshToken = localStorage.getItem("fitbit_refresh_token");

  if (refreshToken) {
    // Refresh token and start fetching data
    refreshAccessToken().then(() => {
      updateFitbitStats();
      setInterval(updateFitbitStats, 300000);
    });
  } else {
    // Add an admin button to initiate OAuth
    const adminSection = document.createElement("div");
    adminSection.className = "admin-section";
    adminSection.innerHTML = `
      <button class="admin-button" onclick="initiateOAuth()">
        <i class="fas fa-key"></i>
        Initialize Fitbit Access
      </button>
    `;
    document.querySelector(".container").appendChild(adminSection);
  }
});
