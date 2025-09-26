import dotenv from 'dotenv';
import app from './app.js';
import pool from './config/db.js';

dotenv.config();

// DB Health Check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`DB Connected: ${result.rows[0].now}`);
  } catch (err) {
    res.status(400).send('DB connection error.');
  }
});



// Separate file for starting server
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;

  const startServer = async () => {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Connected to Supabase PostgreSQL');
      app.listen(PORT, () => {
        console.log(`🚀 Server is running on ${PORT}`);
      });
    } catch (err) {
      console.error('❌ Failed to connect to DB:', err);
      process.exit(1);
    }
  };

  startServer();
}

export default app;
