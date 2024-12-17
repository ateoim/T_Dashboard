const fetch = require("node-fetch");

let requestCount = 0;

const refreshAccessToken = async () => {
  try {
    console.log("Attempting to refresh token with:", {
      clientIdExists: !!process.env.FITBIT_CLIENT_ID,
      clientSecretExists: !!process.env.FITBIT_CLIENT_SECRET,
      refreshTokenExists: !!process.env.FITBIT_REFRESH_TOKEN,
    });

    const response = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.FITBIT_REFRESH_TOKEN,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Token refresh failed:", {
        status: response.status,
        statusText: response.statusText,
        errorMessage: errorData.errors?.[0]?.message,
        errorType: errorData.errors?.[0]?.errorType,
      });
      throw new Error(
        `Failed to refresh token: ${response.status} ${response.statusText} - ${
          errorData.errors?.[0]?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();

    // Update Netlify environment variables with new tokens
    await fetch(
      "https://api.netlify.com/api/v1/sites/" +
        process.env.NETLIFY_SITE_ID +
        "/env",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          FITBIT_ACCESS_TOKEN: data.access_token,
          FITBIT_REFRESH_TOKEN: data.refresh_token,
        }),
      }
    );

    return data.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
};

// Main handler for API requests
const apiHandler = async (event) => {
  try {
    let accessToken = process.env.FITBIT_ACCESS_TOKEN;

    // Add logging for debugging
    console.log(
      "Starting request with endpoint:",
      event.queryStringParameters?.endpoint
    );
    console.log("Access token exists:", !!accessToken);

    const fetchWithToken = async (token) => {
      const url = `https://api.fitbit.com/1/user/-/${event.queryStringParameters.endpoint}`;
      console.log("Fetching from:", url);

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          console.log("Token expired, attempting refresh");
          const newToken = await refreshAccessToken();
          return fetchWithToken(newToken);
        }

        const data = await response.json();
        console.log("Response data:", data);
        return data;
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        throw fetchError;
      }
    };

    const data = await fetchWithToken(accessToken);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Failed to fetch Fitbit data",
        message: error.message,
        stack: error.stack,
      }),
    };
  }
};

// Scheduled handler for token refresh
const scheduledHandler = async (event) => {
  try {
    console.log("Running scheduled token refresh");
    await refreshAccessToken();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Token refresh successful" }),
    };
  } catch (error) {
    console.error("Scheduled refresh failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Token refresh failed" }),
    };
  }
};

exports.handler = async (event) => {
  // Check if this is a scheduled event
  if (event.type === "scheduled") {
    return scheduledHandler(event);
  }
  // Otherwise handle as normal API request
  return apiHandler(event);
};
