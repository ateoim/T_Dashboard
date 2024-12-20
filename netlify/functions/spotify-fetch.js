import fetch from "node-fetch";

const refreshSpotifyToken = async () => {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${data.error}`);
    }

    // Store new access token
    process.env.SPOTIFY_ACCESS_TOKEN = data.access_token;
    return data.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
};

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const endpoint = event.queryStringParameters?.endpoint;
    if (!endpoint) throw new Error("No endpoint specified");

    const makeRequest = async (accessToken) => {
      const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        // Token expired, refresh and retry
        const newToken = await refreshSpotifyToken();
        return makeRequest(newToken);
      }

      return response;
    };

    const response = await makeRequest(process.env.SPOTIFY_ACCESS_TOKEN);
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
