async function fetchFitbitData(endpoint) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(
        `Attempting to fetch ${endpoint} (attempt ${attempt + 1}/${maxRetries})`
      );

      const response = await fetch(
        `/.netlify/functions/fitbit-fetch?endpoint=${encodeURIComponent(
          endpoint
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to fetch ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        if (response.status === 500 && attempt < maxRetries - 1) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Successfully fetched ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      if (attempt === maxRetries - 1) throw error;
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// When initializing the dashboard
async function initializeDashboard() {
  try {
    console.log("Initializing dashboard...");

    // Array of all endpoints to fetch
    const endpoints = [
      "activities/steps/date/today/1d.json",
      "activities/heart/date/today/1d.json",
      "activities/calories/date/today/1d.json",
      "sleep/date/2024-12-15.json",
      "activities/distance/date/today/1d.json",
    ];

    // Fetch all data in parallel
    const results = await Promise.allSettled(
      endpoints.map((endpoint) => fetchFitbitData(endpoint))
    );

    console.log("All fetch requests completed:", results);

    // Process results
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        updateDashboard(endpoints[index], result.value);
      } else {
        console.error(`Failed to fetch ${endpoints[index]}:`, result.reason);
      }
    });
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
  }
}
