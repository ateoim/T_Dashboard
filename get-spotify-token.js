import fetch from "node-fetch";

async function getSpotifyTokens(code) {
  const CLIENT_ID = "5869f6f2ffa7408887767e0a6e3c3731";
  const CLIENT_SECRET = "9919e40f8af94beb913168dccc90ac51";

  try {
    console.log("Using credentials:", `${CLIENT_ID}:${CLIENT_SECRET}`);

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "https://tomdata11.netlify.app/spotify.html",
      }),
    });

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Full response:", data);

    if (data.error) {
      console.error("Error:", data.error_description);
    } else {
      console.log("Access Token:", data.access_token);
      console.log("Refresh Token:", data.refresh_token);
    }
  } catch (error) {
    console.error("Failed to get tokens:", error);
  }
}

const code =
  "AQAKvNuM_35MP5tH6VwfPlUqNFLGv3bBixTeCKV8NLZ6_m9ZKUoYZKF6K17MhU7hlkyRRR4WHq1yhURgDUTAGA4pUPnENUVF4cHG7T1WQaNJrBJbS1hjHEQ72oj33EvHwiDn55KOgFerfNWc50tNbkevjUe_BsT9OPjkbL5csN055kKDAzZ-FhlwQh4ROb5EIPE9LNsPzkbHJiaSZCng2-ZhtIZ_6Fdwo5MMp95rUYEZO9GbSqo7bR2S0Mzh9pb7OoXRw8LnkDB4ITGtNnY6_YnYpz4j0_Nhz7F_l6FveE0PokxH59pq5HQ";
getSpotifyTokens(code);
