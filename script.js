const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');

// Database connection configuration
const dbConfig = {
  host: 'sql12.freemysqlhosting.net',
  user: 'sql12730411', // Replace with your DB username
  password: 'My5174Qhiq', // Replace with your DB password
  database: 'sql12730411', // Replace with your DB name
};

async function deleteAllTables(connection) {
  const [rows] = await connection.query("SHOW TABLES");
  const tableNames = rows.map(row => Object.values(row)[0]);
  if (tableNames.length) {
    await connection.query(`SET FOREIGN_KEY_CHECKS = 0;`);
    for (const table of tableNames) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`Deleted table: ${table}`);
    }
    await connection.query(`SET FOREIGN_KEY_CHECKS = 1;`);
  }
}

async function createTables(connection) {
  const createTable1 = `
    CREATE TABLE IF NOT EXISTS Table1 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100),
      phone VARCHAR(20),
      credit_card_number VARCHAR(20),
      age INT,
      aws_access_key VARCHAR(20),
      aws_secret_key VARCHAR(40),
      credit_debit_cvv VARCHAR(4),
      license_plate VARCHAR(10),
      ip_address VARCHAR(45),
      mac_address VARCHAR(17)
    );
  `;
  
  const createTable2 = `
    CREATE TABLE IF NOT EXISTS Table2 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      address VARCHAR(255),
      ssn VARCHAR(20),
      passport_number VARCHAR(20),
      date_time DATETIME,
      url VARCHAR(255),
      bank_account_number VARCHAR(20),
      swift_code VARCHAR(11),
      driver_id VARCHAR(15),
      vehicle_identification_number VARCHAR(17)
    );
  `;

  await connection.query(createTable1);
  console.log('Created Table1');
  await connection.query(createTable2);
  console.log('Created Table2');
}

async function insertPIIIntoTables(connection) {
  const insertIntoTable1 = `
    INSERT INTO Table1 (name, email, phone, credit_card_number, age, aws_access_key, aws_secret_key, credit_debit_cvv, license_plate, ip_address, mac_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const insertIntoTable2 = `
    INSERT INTO Table2 (address, ssn, passport_number, date_time, url, bank_account_number, swift_code, driver_id, vehicle_identification_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  for (let i = 0; i < 10; i++) {
    // Generate fake data for Table1
    const name = faker.name.findName();
    const email = faker.internet.email();
    const phone = faker.phone.phoneNumber();
    const creditCardNumber = faker.finance.creditCardNumber();
    const age = faker.datatype.number({ min: 18, max: 90 });
    const awsAccessKey = faker.random.alphaNumeric(20).toUpperCase();
    const awsSecretKey = faker.random.alphaNumeric(40).toUpperCase();
    const creditDebitCVV = faker.finance.creditCardCVV();
    const licensePlate = faker.vehicle.vrm();
    const ipAddress = faker.internet.ip();
    const macAddress = faker.internet.mac();

    await connection.execute(insertIntoTable1, [
      name, email, phone, creditCardNumber, age, awsAccessKey, awsSecretKey, creditDebitCVV, licensePlate, ipAddress, macAddress
    ]);

    // Generate fake data for Table2
    const address = faker.address.streetAddress();
    const ssn = faker.helpers.replaceSymbols('###-##-####');
    const passportNumber = faker.helpers.replaceSymbols('A######');
    const dateTime = faker.date.past();
    const url = faker.internet.url();
    const bankAccountNumber = faker.finance.account();
    const swiftCode = faker.helpers.replaceSymbols('####USAA');
    const driverId = faker.helpers.replaceSymbols('D######');
    const vehicleIdentificationNumber = faker.vehicle.vin();

    await connection.execute(insertIntoTable2, [
      address, ssn, passportNumber, dateTime, url, bankAccountNumber, swiftCode, driverId, vehicleIdentificationNumber
    ]);

    console.log(`Inserted PII data into Table1 and Table2: Record ${i + 1}`);
  }
}

(async function() {
  let connection;
  try {
    // Connect to the database
    connection = await mysql.createConnection(dbConfig);

    // Delete all existing tables
    await deleteAllTables(connection);

    // Create new tables
    await createTables(connection);

    // Insert PII data into tables
    await insertPIIIntoTables(connection);

    console.log('Process completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
})();
