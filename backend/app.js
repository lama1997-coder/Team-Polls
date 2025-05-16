const express = require('express');
const mysql = require('mysql2');
const { body, validationResult } = require('express-validator');
const { Server } = require('socket.io');
const cors = require('cors');
const http = require('http');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');

require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const voteLimiter = rateLimit({
  windowMs: 5000,
  max: 1, 
  message: 'Too many votes, please try again later.',
  keyGenerator: (req) => {
    return req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// Initialize app and server
const app = express();
const helmet = require('helmet');
app.use(helmet());
const morgan = require('morgan');
app.use(morgan('combined'));
const server = http.createServer(app);
;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
})
app.use(limiter);
//cors
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
//socket
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
// Redis
const pubClient = createClient({ host: 'redis', port: 6379 ,lazyConnect: true,});
const subClient = pubClient.duplicate({lazyConnect: true,});

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis adapter connected');
  })
  .catch((err) => {
    console.error('❌ Failed to connect Redis adapter:', err);
  });


// Connect to MySQL
const database = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

database.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    process.exit(1); // Stop the app if DB fails
  } else {
    console.log('✅ Connected to MySQL database');
  }
});

const pollRouter = require('./routes/pollRoute');
const authRouter = require('./routes/authRoute');
app.use("/api", pollRouter(database, io, voteLimiter));
app.use("/api", authRouter);


//db migration
app.get('/init', (req, res) => {

  const createOptionsTable = `
    CREATE TABLE IF NOT EXISTS options (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question_id INT,
      option_text VARCHAR(255),
      votes INT DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `;
  const createVotesTable = `
  CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    option_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE
  )
`;
  const createQuestionsTable = `
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question TEXT NOT NULL,
      expireAt DATETIME NOT NULL
    )
  `;

  database.query(createQuestionsTable, (err) => {
    if (err) return res.status(500).send("Error creating questions table");

    database.query(createOptionsTable, (err) => {
      if (err) return res.status(500).send("Error creating options table");
    });
    database.query(createVotesTable, (err) => {
      if (err) return res.status(500).send("Error creating votes table");

      res.send(' Questions, Options, and Votes tables created!');
    });
  });
});


io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('subscribe', (pollId) => {
    console.log(`Subscribing to poll:${pollId}`);
    // socket.join(`poll:${pollId}`);
    socket.join(`${pollId}`); // match the emit path

  });

  socket.on('unsubscribe', (pollId) => {
    console.log(` Unsubscribing from poll:${pollId}`);
    socket.leave(`${pollId}`);
  });
  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
  });

  socket.on('disconnect', () => {
    console.log(' Client disconnected');
  });
});

server.listen(process.env.PORT||8989, () => {
  console.log('Server running on http://localhost:9898');
});
