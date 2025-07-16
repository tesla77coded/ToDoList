import dotenv from 'dotenv';
import express from 'express';
import pool from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRouter.js';

dotenv.config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const app = express();
app.use(express.json());

// check connection to the db
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`DB Connected: ${result.rows[0].now}`);
  } catch (err) {
    res.status(400).send('DB connection error.');
  };
});

const PORT = process.env.PORT || 5000;

// mount APIs
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tasks', taskRoutes)


//handle requests to non-existing routes
app.use(notFound)
app.use(errorHandler)

//start server ensuring connection to the db
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
