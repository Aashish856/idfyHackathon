const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const csvParser = require('csv-parser');
const pdfParse = require('pdf-parse');

// Helper function to write content to a text file
const writeToFile = async (filePath, content) => {
  const textFilePath = filePath.replace(path.extname(filePath), '.txt');
  await fsPromises.writeFile(textFilePath, content, 'utf8');
  return textFilePath;
};

// Convert CSV to text file (includes headers and rows)
exports.convertCSVToText = async (csvFilePath) => {
  let content = '';

  // Read the CSV file and process it
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (row) => {
        // Combine headers and rows as text (key: value pairs)
        content += Object.entries(row)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ') + '\n';
      })
      .on('end', async () => {
        try {
          const textFilePath = await writeToFile(csvFilePath, content);
          resolve(textFilePath);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => reject(error));
  });
};

// Convert JSON to text file
exports.convertJSONToText = async (jsonFilePath) => {
  try {
    const jsonData = await fsPromises.readFile(jsonFilePath, 'utf8');
    const jsonObject = JSON.parse(jsonData);

    // Convert the JSON object to a string format
    const content = JSON.stringify(jsonObject, null, 2);  // Pretty print JSON
    return await writeToFile(jsonFilePath, content);
  } catch (error) {
    throw new Error(`Error processing JSON file: ${error.message}`);
  }
};

// Extract text from PDF file
exports.extractTextFromFilesInFolder = async (folderPath) => {
    try {
      // Read all files in the directory
      const files = await fsPromises.readdir(folderPath);
      let combinedText = '';
      // Loop through each file in the directory
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        // console.log(filePath)
        const extname = path.extname(file).toLowerCase();
        // console.log(extname)
        if (extname === '.pdf') {
          // Process PDF files
          const dataBuffer = await fsPromises.readFile(filePath);
          const pdfData = await pdfParse(dataBuffer);
          combinedText += pdfData.text + '\n'; // Separate content of each PDF with a new line
  
        } else if (extname === '.txt') {
          // Process text files
          const fileContent = await fsPromises.readFile(filePath, 'utf8');
          combinedText += fileContent + '\n'; // Separate content of each text file with a new line
        }
      }
  
      // Write combined text content to a single text file
    //   console.log(combinedText)
      const textFilePath = await writeToFile(folderPath + "/combined.txt", combinedText);

      console.log(folderPath)
      
      return textFilePath;
    } catch (error) {
      throw new Error(`Error extracting text from files: ${error.message}`);
    }
  };
  