import fetch from "node-fetch";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const endpoint = event.queryStringParameters?.endpoint;
    console.log("Endpoint requested:", endpoint);

    if (!endpoint) throw new Error("No endpoint specified");

    const token = process.env.SPOTIFY_ACCESS_TOKEN;
    console.log("Using token:", token ? "Token exists" : "No token found");

    const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Spotify API response status:", response.status);

    return {
      statusCode: response.status,
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
