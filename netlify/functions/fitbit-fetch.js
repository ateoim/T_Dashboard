const fetch = require("node-fetch");

let requestCount = 0;

const refreshAccessToken = async () => {
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
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return data.access_token;
};

const handler = async (event) => {
  try {
    let accessToken = process.env.FITBIT_ACCESS_TOKEN;

    const fetchWithToken = async (token) => {
      const response = await fetch(
        `https://api.fitbit.com/1/user/-/${event.queryStringParameters.endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        // Token expired, refresh and try again
        const newToken = await refreshAccessToken();
        // Retry the request with new token
        return fetchWithToken(newToken);
      }

      return response;
    };

    const response = await fetchWithToken(accessToken);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch Fitbit data" }),
    };
  }
};

exports.handler = handler;
