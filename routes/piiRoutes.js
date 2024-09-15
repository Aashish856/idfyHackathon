const express = require('express');
const router = express.Router();
const structuredController = require('../controllers/structuredController');
const semiStructuredController = require('../controllers/semiStructuredController');
const unstructuredController = require('../controllers/unstructuredController');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const detectPII = require('../scripts/piiDetector');
const fs = require('fs');
// Function to generate a unique filename using UUID
function generateUniqueFileName() {
    const uuid = uuidv4();
    return `./tempData/output_${uuid}.txt`;
}



// Route for detecting PII based on data type
router.post('/', async (req, res) => {
  try {
    const { filePath, dataType } = req.body;
    console.log(filePath, dataType);

    let result;

    if (dataType === "structured") {
      result = await structuredController.handleStructuredData(filePath);
    } else if (dataType === "semi-structured") {
      result = await semiStructuredController.handleSemiStructuredData(filePath);
    } else if (dataType === "unstructured") {
      result = await unstructuredController.handleUnstructuredData(filePath);
    } else {
      return res.status(400).json({ error: "Invalid data type" });
    }

    res.send(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/sql', async (req, res) => {
  try {
    // 1. Connect to the MySQL database
    const { host, root, password, database } = req.body;
    const connection = await mysql.createConnection({
        host: host,
        user: root,
        password: password,
        database: database,
    });

    // 2. Get all table names from the database
    const [tables] = await connection.execute(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ?`, [database]);

    console.log('Tables:', tables); // Debugging output

    // 3. Open a write stream to the text file
    const uniqueFileName = generateUniqueFileName();
    const writableStream = fs.createWriteStream(uniqueFileName);

    // 4. Iterate over all tables and fetch data
    for (let table of tables) {
        const tableName = table.table_name; // Adjust property name if needed
        if (!tableName) {
            console.error('Table name is undefined or invalid');
            continue;
        }

        console.log(`Fetching data from table: ${tableName}`);

        // Fetch all rows from the current table
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);

        if (rows.length === 0) continue; // Skip empty tables

        // 5. Write the data to the TXT file in the desired format
        rows.forEach((row) => {
            let rowString = '';
            Object.keys(row).forEach((columnName) => {
                rowString += `${columnName}: ${row[columnName]}, `;
            });

            // Remove trailing comma and space, then write to file
            writableStream.write(rowString.slice(0, -2) + '\n');
        });

        writableStream.write('\n'); 
    }

    // 6. Close the writable stream
    writableStream.end();

    // Ensure the file stream is finished before proceeding
    await new Promise((resolve) => writableStream.on('finish', resolve));

    // 7. Process the file for PII detection
    const piiResults = await detectPII(uniqueFileName);

    console.log("Detected PII Entities:", piiResults);

    // Return results in the response
    res.json(piiResults);
  } catch (error) {
    console.error('Error fetching data from tables:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

module.exports = router; 
