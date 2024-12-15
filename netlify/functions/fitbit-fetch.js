const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // Add detailed logging
  console.log("Function started", {
    queryParams: event.queryStringParameters,
    hasToken: !!process.env.FITBIT_ACCESS_TOKEN,
    tokenFirstChars: process.env.FITBIT_ACCESS_TOKEN
      ? process.env.FITBIT_ACCESS_TOKEN.substring(0, 10) + "..."
      : "none",
  });

  const { endpoint } = event.queryStringParameters || {};
  const accessToken = process.env.FITBIT_ACCESS_TOKEN;

  if (!endpoint) {
    console.log("No endpoint provided");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No endpoint specified" }),
    };
  }

  if (!accessToken) {
    console.log("No access token found in environment");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Access token not configured" }),
    };
  }

  try {
    const url = `https://api.fitbit.com/1/user/-/${endpoint}`;
    console.log("Attempting Fitbit API request to:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Fitbit API error response:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Fitbit API error",
          details: errorData,
          status: response.status,
          statusText: response.statusText,
        }),
      };
    }

    const data = await response.json();
    console.log("Successful response received");

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Function error:", {
      message: error.message,
      stack: error.stack,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};
