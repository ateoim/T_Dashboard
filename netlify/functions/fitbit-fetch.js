import fetch from "node-fetch";

const refreshAccessToken = async () => {
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

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Token refresh failed: ${
          data.errors?.[0]?.message || response.statusText
        }`
      );
    }

    // Store new tokens
    process.env.FITBIT_ACCESS_TOKEN = data.access_token;
    process.env.FITBIT_REFRESH_TOKEN = data.refresh_token;

    return data.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
};

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  try {
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

      // If token expired, refresh and retry
      if (response.status === 401) {
        console.log("Token expired, refreshing...");
        const newToken = await refreshAccessToken();
        return makeRequest(newToken);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || "Fitbit API error");
      }

      return data;
    };

    const data = await makeRequest(process.env.FITBIT_ACCESS_TOKEN);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
