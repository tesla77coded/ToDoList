import db from '../config/db.js';
import { uploadFileToSupabase } from '../utils/uploadToSupabase.js';
import redis from '../utils/redisClient.js';

export const createTask = async (req, res) => {

  const { title, description } = req.body;

  if (!title && !description) {
    res.status(400);
    throw new Error('Task must have atleast title or description.');
  }

  let imageUrl = null;
  let audioUrl = null;

  try {
    if (req.files?.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      imageUrl = await uploadFileToSupabase(
        imageFile.buffer,
        imageFile.originalname,
        'images',
      );
    }

    if (req.files?.audio && req.files.audio[0]) {
      const audioFile = req.files.audio[0];
      audioUrl = await uploadFileToSupabase(
        audioFile.buffer,
        audioFile.originalname,
        'audios',
      );
    }

    const result = await db.query(
      `INSERT INTO tasks (user_id, title, description, imageUrl, audioUrl) VALUES($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, description, imageUrl, audioUrl]
    );

    const task = result.rows[0];

    return res.status(201).json({ task, message: 'Task created successfully.' });

  } catch (err) {
    console.log(err);
    res.status(500);
    throw new Error('Task creation failed.');
  }

};


export const getTasksByUser = async (req, res) => {

  const { after } = req.query;
  const limit = parseInt(req.query.limit) || 5;

  const cursor = after || 'initial';
  const redisKey = `tasks:user:${req.user.id}:after:${cursor}:limit:${limit}`;

  try {
    const cached = await redis.get(redisKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const baseQuery = `SELECT * FROM tasks WHERE user_id = $1 
      ${after ? 'AND created_at < $2' : ''} ORDER BY created_at DESC LIMIT $${after ? 3 : 2}`;

    const params = after ? [req.user.id, after, limit] : [req.user.id, limit];

    const result = await db.query(baseQuery, params);
    const tasks = result.rows;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM tasks WHERE user_id = $1`, [req.user.id]
    );
    const totalTasks = parseInt(countResult.rows[0].count);

    const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

    const response = {
      tasks,
      nextCursor,
      totalTasks,
    };

    await redis.set(redisKey, JSON.stringify(response), { EX: 300 });

    return res.status(200).json(response);

  } catch (err) {
    console.log(err);
    res.status(500);
    throw new Error('Failed to fetch tasks.');
  }
};


export const updateTaskByUser = async (req, res) => {
  const { id } = req.params;
  const { title, description, is_completed } = req.body;

  const exisisting = await db.query(
    `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
    [id, req.user.id]
  );

  const task = exisisting.rows[0];

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }


  const updated = await db.query(
    `UPDATE tasks SET title = $1, description = $2, is_completed = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING * `,
    [
      title || task.title,
      description || task.description,
      typeof is_completed === 'boolean' ? is_completed : task.is_completed,
      id,
    ]
  );
  const updatedTask = updated.rows[0];

  // invalidate user's paginated cache 
  const userKeys = await redis.keys(`tasks:user:${req.user.id}:after*`);
  if(userKeys.length > 0) {
   await redis.del(userKeys);
  };

  res.status(200).json(updatedTask);
};


export const deleteTaskByUser = async (req, res) => {
  const { id } = req.params;

  const exisisting = await db.query(
    `SELECT id FROM tasks WHERE id = $1 and user_id = $2`,
    [id, req.user.id]
  );

  const exisistingTask = exisisting.rows[0];

  if (!exisistingTask) {
    res.status(404);
    throw new Error('Task not found.');
  }

  // clearing the task cache if there is any
  await redis.del(`tasks: user:${req.user.id} `);

  await db.query(`DELETE FROM tasks WHERE id = $1`, [id]);
  res.status(200).json({ message: `Task ${id} deleted.` });
};

export const getAllTasksByAdmin = async (req, res) => {

  const { after } = req.query;
  const limit = parseInt(req.query.limit) || 5;

  const cursor = after || 'initial';
  const redisKey = `admin:tasks:after:${cursor}:limit:{limit}`;

  try {
    const cached = await redis.get(redisKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const baseQuery = `
      SELECT * FROM tasks 
      ${after ? 'WHERE created_at < $1' : ''}
      ORDER BY created_at DESC
      LIMIT $${after ? 2 : 1}`;

    const queryParams = after ? [after, limit] : [limit];

    const result = await db.query(baseQuery, queryParams);
    const tasks = result.rows;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM tasks`
    );
    const totalTasks = parseInt(countResult.rows[0].count);


    const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

    const response = {
      tasks,
      nextCursor,
      totalTasks,
    };

    await redis.set(redisKey, JSON.stringify(response), { EX: 300 });
    res.status(200).json(response);

  } catch (err) {

    console.log(err);
    res.status(500);
    throw new Error('Failed to fetch tasks.');
  };

};


export const deleteTaskByAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT id from tasks WHERE id = $1`, [id]
    );

    const task = result.rows[0];

    if (!task) {
      res.status(404);
      throw new Error('Task not found.');
    }

    await db.query(
      `DELETE from tasks WHERE id = $1`, [id]
    );

    //invalidate user cached pages
    const userKeys = await redis.keys(`tasks:user:${task.user._id}:after:*`);
    if (userKeys.length > 0) {
      await redis.del(userKeys);
    };

    //invalidate admin cached pages
    const adminKeys = await redis.keys(`admin:tasks:after:*`);
    if (adminKeys.length > 0) {
      await redis.del(adminKeys);
    };

    res.status(200).json({ message: `Task ${id} deleted successfully.` });

  } catch (err) {
    console.log(err);
    res.status(500);
    throw new Error(`Error while deleting the task: ${id}`);
  }
};
