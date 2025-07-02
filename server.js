import dotenv from 'dotenv';
import express from 'express';
import pool from './config/db.js';

dotenv.config();

const app = express();
app.use(express.json());


app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`DB Connected: ${result.rows[0].now}`);
  } catch (err) {
    res.status(400).send('DB connection error.');
  };
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to Supabase PostgreSQL');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on: http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Failed to connect to Supabase DB, server not started', err);
    process.exit(1);
  };
};

startServer();
