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

exports.handler = handler;
