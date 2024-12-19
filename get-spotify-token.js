import fetch from "node-fetch";

async function getSpotifyTokens(code) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          "e2e15c5deef14339b504d97037b8abe3:a65f49897619db388eb823ada11038c"
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: "https://tomdata11.netlify.app/spotify.html",
    }),
  });

  const data = await response.json();
  console.log("Access Token:", data.access_token);
  console.log("Refresh Token:", data.refresh_token);
}

// Replace with the code you get from the redirect URL
const code = "your-code-here";
getSpotifyTokens(code);
