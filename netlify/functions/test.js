exports.handler = async (event) => {
  console.log("Test function called!");
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Test successful" }),
  };
};
