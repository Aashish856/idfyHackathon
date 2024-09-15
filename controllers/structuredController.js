const fileUtils = require('../utils/fileUtils');
const detectPII = require('../scripts/piiDetector');

exports.handleStructuredData = async (filePath) => {
  try {
    // Read CSV, convert to text
    const textFilePath = await fileUtils.convertCSVToText(filePath);
    console.log("Text File Path:", textFilePath);

    // Call detectPII which now returns a promise
    const piiResults = await detectPII(textFilePath);

    console.log("Detected PII Entities:", piiResults);
    
    return piiResults; // Ensure to return the result
  } catch (error) {
    console.error("Error handling structured data:", error);
    throw new Error("Failed to process structured data"); // Throw error for proper handling in the route
  }
};
