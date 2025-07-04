export const createTask = async (req, res) => {

  const { title, description, image_url, audio_url } = req.body;

  if (!title && !description) {
    res.status(400);
    throw new Error('Task must have atleast a title or description.');
  }

  const result = await db.query(
    `INSERT INTO tasks (user_id, title, description, image_url, audio_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user.id, title, description, image_url || null, audio_url || null]
  );

  const task = result.rows[0];

  res.status(201).json(task);
};


export const getTasksByUser = async (req, res) => {
  const result = await db.query(
    `SELECT FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );

  const tasksList = result.rows[0];

  res.status(200).json(tasksList);
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
    `UPDATE tasks SET title = $1, description = $2, is_completed = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
    [
      title || task.title,
      description || task.description,
      typeof is_completed === 'boolean' ? is_completed : task.is_completed,
      id,
    ]
  );

  // WE WILL BE IMPLEMENTING FILE UPDATING / DELETING LATER ON.

  const updatedTask = updated.rows[0];

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

  await db.query(`DELETE FROM tasks WHERE id = $1`, [id]);
  res.status(200).json({ message: `Task ${id} deleted.` });
};



