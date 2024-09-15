const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

// PII Patterns
const patterns = {
  // Existing patterns...
  AGE: /\b\d{1,3}\s(years|yrs|years old|y.o)\b/g,
  AWS_ACCESS_KEY: /\b[A-Z0-9]{20}\b/g,
  AWS_SECRET_KEY: /\b[A-Z0-9]{40}\b/g,
  CREDIT_DEBIT_CVV: /\b\d{3,4}\b/g,
  CREDIT_DEBIT_EXPIRY: /\b(?:0[1-9]|1[0-2])\/\d{2,4}\b/g,
  CREDIT_DEBIT_NUMBER: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  DATE_TIME: /\b(?:\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}|(?:\d{1,2}\/\d{1,2}\/\d{2,4})|\d{1,2} (?:AM|PM) \d{1,2}(:\d{2})?)\b/g,
  DRIVER_ID: /\b[A-Z0-9]{1,15}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  INTERNATIONAL_BANK_ACCOUNT_NUMBER: /\b[A-Z0-9]{15,34}\b/g,
  IP_ADDRESS: /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  LICENSE_PLATE: /\b[A-Z0-9]{1,8}\b/g,
  MAC_ADDRESS: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
  PASSWORD: /\b[a-zA-Z0-9!@#$%^&*()_+=\-`~]{8,}\b/g,
  PHONE: /\b(?:\+?\d{1,4}[-.\s]?)?\(?\d{1,5}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
  PIN: /\b\d{4}\b/g,
  SWIFT_CODE: /\b[A-Z]{4}[A-Z]{2}\d{2}(?:[A-Z\d]{3})?\b/g,
  URL: /\b(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*\b/g,
  VEHICLE_IDENTIFICATION_NUMBER: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
  CA_HEALTH_NUMBER: /\b\d{10}\b/g,
  CA_SOCIAL_INSURANCE_NUMBER: /\b\d{3}-\d{3}-\d{3}\b/g,
  IN_AADHAAR: /\b\d{4}\s\d{4}\s\d{4}\b/g,
  IN_NREGA: /\b[A-Z]{2}\d{14}\b/g,
  IN_PERMANENT_ACCOUNT_NUMBER: /\b[A-Z]{5}\d{4}[A-Z]\d{1}\b/g,
  IN_VOTER_NUMBER: /\b[A-Z]{3}\d{7}\b/g,
  UK_NATIONAL_HEALTH_SERVICE_NUMBER: /\b\d{3} \d{3} \d{4}|\d{3} \d{3} \d{4} \d{3}\b/g,
  UK_NATIONAL_INSURANCE_NUMBER: /\b[A-Z]{2}\d{6}[A-Z]\b/g,
  UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER: /\b\d{10}\b/g,
  BANK_ACCOUNT_NUMBER: /\b\d{10,12}\b/g,
  BANK_ROUTING: /\b\d{9}\b/g,
  PASSPORT_NUMBER: /\b[A-Z0-9]{6,9}\b/g,
  US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER: /\b9\d{2}-\d{2}-\d{4}\b/g,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g
};

// Keywords for new PII types
const keywords = {
  // Existing keywords...
  AGE: ['age', 'years old', 'y.o', 'birthday'],
  AWS_ACCESS_KEY: ['aws access key', 'access key', "aws"],
  AWS_SECRET_KEY: ['aws secret key', 'secret key', "aws"],
  CREDIT_DEBIT_CVV: ['cvv', 'cvc', 'security code', "credit", "debit"],
  CREDIT_DEBIT_EXPIRY: ['expiry date', 'expiration date', 'exp date', 'credit', 'debit', 'expiry'],
  CREDIT_DEBIT_NUMBER: ['credit card number', 'debit card number', 'credit', 'debit'],
  DATE_TIME: ['date', 'time', 'year', 'month', 'day', 'am', 'pm'],
  DRIVER_ID: ['driver id', 'driver license number', 'driver'],
  EMAIL: ['email'],
  INTERNATIONAL_BANK_ACCOUNT_NUMBER: ['iban'],
  IP_ADDRESS: ['ip address', 'ip'],
  LICENSE_PLATE: ['license plate', 'license'],
  MAC_ADDRESS: ['mac address' , 'mac'],
  PASSWORD: ['password'],
  PHONE: ['phone number', 'telephone', 'fax', 'pager'],
  PIN: ['pin'],
  SWIFT_CODE: ['swift code', 'bic'],
  URL: ['url', 'web address'],
  VEHICLE_IDENTIFICATION_NUMBER: ['vin'],
  CA_HEALTH_NUMBER: ['health number'],
  CA_SOCIAL_INSURANCE_NUMBER: ['sin'],
  IN_AADHAAR: ['aadhaar'],
  IN_NREGA: ['nrega'],
  IN_PERMANENT_ACCOUNT_NUMBER: ['pan'],
  IN_VOTER_NUMBER: ['voter id', 'voter'],
  UK_NATIONAL_HEALTH_SERVICE_NUMBER: ['nhs number'],
  UK_NATIONAL_INSURANCE_NUMBER: ['national insurance number', 'nino'],
  UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER: ['utr', 'tax', 'taxpayer'],
  BANK_ACCOUNT_NUMBER: ['bank account number', 'bank', 'account'],
  BANK_ROUTING: ['routing number'],
  PASSPORT_NUMBER: ['passport number', 'passport'],
  US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER: ['itin'],
  SSN: ['ssn', 'social security number', 'social security']
};


// Function to check if a keyword exists near a detected PII entity
const checkRelatedKeywords = (text, index, keywordList) => {
  const windowSize = 50;
  const start = Math.max(0, index - windowSize);
  const end = Math.min(text.length, index + windowSize);
  const context = text.slice(start, end).toLowerCase();

  return keywordList.some(keyword => context.includes(keyword));
};

// Function to detect PII
const detectPII = async (filePath) => {
  try {
    console.log(filePath)
    const data = await fs.readFile(filePath, 'utf8');

    let results = [];

    // Loop through each PII pattern
    for (let [piiType, regex] of Object.entries(patterns)) {
      let match;
      while ((match = regex.exec(data)) !== null) {
        let matchedText = match[0];
        let matchIndex = match.index;

        if (piiType in keywords) {
          // If there are related keywords, check for them around the match
          if (checkRelatedKeywords(data, matchIndex, keywords[piiType])) {
            results.push({ type: piiType, value: matchedText, index: matchIndex });
          }
        } else {
          // Directly push the match for types like date, time, email
          results.push({ type: piiType, value: matchedText, index: matchIndex });
        }
      }
    }

    const uniqueId = uuidv4(); // Generate a unique ID for the files
    const tempInputFile = `./outputs/input_${uniqueId}.txt`;
    const tempOutPIIPath = `./outputs/output_2_${uniqueId}.json`;
    const tempOutPII2Path = `./outputs/output_1_${uniqueId}.json`;

    // Ensure the directory exists
    await fs.mkdir('./scripts', { recursive: true });

    // Write files
    await fs.writeFile(tempInputFile, data);
    await fs.writeFile(tempOutPIIPath, JSON.stringify(results, null, 4));

    // Start the Python script asynchronously
    const pythonProcess = spawn('python', ['./scripts/detect_ner.py', tempInputFile, tempOutPII2Path, tempOutPIIPath]);

    pythonProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python script exited with code ${code}`);
    });

    // Return the output file name immediately
    obj = {
      "out_path": `output_1_${uniqueId}.json`,
      "msg": "You can view your results here"
    }
    return obj;
  } catch (err) {
    console.error("Error processing file:", err);
  }
};

// Export the detectPII function
module.exports = detectPII;
