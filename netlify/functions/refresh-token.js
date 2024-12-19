import fetch from "node-fetch";

export const handler = async () => {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      // Update your environment variable here
      // You'll need to implement this part based on your hosting setup
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    throw new Error("Failed to refresh token");
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
