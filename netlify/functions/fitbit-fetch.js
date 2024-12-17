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
    if (!event.queryStringParameters?.endpoint) {
      console.error("No endpoint provided in query parameters");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No endpoint provided" }),
      };
    }

    let accessToken = process.env.FITBIT_ACCESS_TOKEN;

    console.log("Debug info:", {
      hasAccessToken: !!accessToken,
      endpoint: event.queryStringParameters.endpoint,
      hasClientId: !!process.env.FITBIT_CLIENT_ID,
      hasClientSecret: !!process.env.FITBIT_CLIENT_SECRET,
      hasRefreshToken: !!process.env.FITBIT_REFRESH_TOKEN,
      hasNetlifySiteId: !!process.env.NETLIFY_SITE_ID,
      hasNetlifyApiToken: !!process.env.NETLIFY_API_TOKEN,
    });

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
    console.error("Handler error:", {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    });
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Failed to fetch Fitbit data",
        details: error.message,
        type: error.constructor.name,
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
  console.log(
    "Function triggered with event type:",
    event.type || "regular request"
  );
  console.log("Query parameters:", event.queryStringParameters);

  try {
    // Check if this is a scheduled event
    if (event.type === "scheduled") {
      console.log("Running scheduled token refresh");
      return scheduledHandler(event);
    }

    // For regular API requests, verify environment variables first
    console.log("Environment check:", {
      hasAccessToken: !!process.env.FITBIT_ACCESS_TOKEN,
      hasClientId: !!process.env.FITBIT_CLIENT_ID,
      hasClientSecret: !!process.env.FITBIT_CLIENT_SECRET,
      hasRefreshToken: !!process.env.FITBIT_REFRESH_TOKEN,
      hasNetlifySiteId: !!process.env.NETLIFY_SITE_ID,
      hasNetlifyApiToken: !!process.env.NETLIFY_API_TOKEN,
    });

    // Handle regular request
    return apiHandler(event);
  } catch (error) {
    console.error("Top-level error:", {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    });

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Function execution failed",
        details: error.message,
        type: error.constructor.name,
      }),
    };
  }
};
