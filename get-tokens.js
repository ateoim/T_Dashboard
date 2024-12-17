import fetch from "node-fetch";

async function getTokens() {
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: "41dc080f35d0373e8ee7bc96726342da685fc71a",
      redirect_uri: "https://tomdata11.netlify.app/fitbit.html",
    }),
  });

  const data = await response.json();
  console.log("Response:", data);
}

getTokens().catch(console.error);
