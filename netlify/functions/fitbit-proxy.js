const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  const endpoint = event.queryStringParameters.endpoint;
  const token = event.queryStringParameters.token;

  try {
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
