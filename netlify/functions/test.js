exports.handler = async (event) => {
  // Basic console logs
  console.log("=== TEST FUNCTION START ===");
  console.log("Event:", JSON.stringify(event));
  console.log(
    "Environment:",
    process.env.NETLIFY_SITE_ID ? "Has env vars" : "No env vars"
  );
  console.log("=== TEST FUNCTION END ===");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Test function executed" }),
  };
};
