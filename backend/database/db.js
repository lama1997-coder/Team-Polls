const mysql = require('mysql2');

const database = mysql.createConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
database.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        process.exit(1); // Stop the app if DB fails
    } else {
        console.log('Connected to MySQL database');
    }
});

module.exports = database;
