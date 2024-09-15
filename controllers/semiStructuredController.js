const fileUtils = require('../utils/fileUtils');
const detectPII = require('../scripts/piiDetector');

exports.handleSemiStructuredData = async (filePath) => {
  try {
    // Read CSV, convert to text
    const textFilePath = await fileUtils.convertJSONToText(filePath);
    console.log("Text File Path:", textFilePath);

    // Call detectPII which now returns a promise
    const piiResults = await detectPII(textFilePath);
    console.log("Detected PII Entities:", piiResults);
    return piiResults;

    // You can now use piiResults for further processing
  } catch (error) {
    console.error("Error handling semi structured data:", error);
  }
};
