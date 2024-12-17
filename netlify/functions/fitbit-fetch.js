const fetch = require("node-fetch");

const refreshAccessToken = async () => {
  console.log("Attempting to refresh token...");

  try {
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
      throw new Error(
        `Token refresh failed: ${response.status} - ${
          errorData.errors?.[0]?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();

    // Update environment variables with new tokens
    await fetch(
      `https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_SITE_ID}/env`,
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

exports.handler = async (event) => {
  console.log("========== FITBIT FETCH START ==========");
  console.log("Request details:", {
    method: event.httpMethod,
    path: event.path,
    params: event.queryStringParameters,
  });

  try {
    // Check environment variables
    const envCheck = {
      hasAccessToken: !!process.env.FITBIT_ACCESS_TOKEN,
      hasClientId: !!process.env.FITBIT_CLIENT_ID,
      hasClientSecret: !!process.env.FITBIT_CLIENT_SECRET,
      hasRefreshToken: !!process.env.FITBIT_REFRESH_TOKEN,
      hasNetlifySiteId: !!process.env.NETLIFY_SITE_ID,
      hasNetlifyApiToken: !!process.env.NETLIFY_API_TOKEN,
    };

    console.log("Environment check:", envCheck);

    const missingVars = Object.entries(envCheck)
      .filter(([_, exists]) => !exists)
      .map(([name]) => name);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    const endpoint = event.queryStringParameters?.endpoint;
    if (!endpoint) {
      throw new Error("No endpoint specified");
    }

    const makeRequest = async (token) => {
      const response = await fetch(
        `https://api.fitbit.com/1/user/-/${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.status === 401) {
        console.log("Token expired, refreshing...");
        const newToken = await refreshAccessToken();
        return makeRequest(newToken); // Retry with new token
      }

      if (!response.ok) {
        throw new Error(`Fitbit API responded with status ${response.status}`);
      }

      return response.json();
    };

    const data = await makeRequest(process.env.FITBIT_ACCESS_TOKEN);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error in fitbit-fetch:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
    };
  }
};
