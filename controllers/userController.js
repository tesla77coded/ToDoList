import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

export const createUser = async (req, res) => {
  const { username, email, password } = req.body;

  const userExists = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  if (userExists.rows.length > 0) {
    res.status(400);
    throw new Error('User already exists.');
  };

  const hashed = await bcrypt.hash(password, 10);

  //check if it is the first user of the db, if yes then make admin, 
  const userCount = await db.query('SELECT COUNT(*) FROM users');
  const isFirstUser = parseInt(userCount.rows[0].count) === 0;

  const result = await db.query(
    `INSERT INTO users (username, email, password, is_admin)
     VALUES($1, $2, $3, $4)
     RETURNING id, username, email, is_admin`,
    [username, email, hashed, isFirstUser]
  );

  const newUser = result.rows[0];
  const token = generateToken(newUser);

  res.status(201).json({
    id: newUser.id,
    user: newUser.username,
    email: newUser.email,
    isadmin: newUser.is_admin,
    token,
  });
};


export const loginUser = async (req, res) => {
  const { identifier, password } = req.body;

  const result = await db.query(
    'SELECT * FROM users WHERE username = $1 OR email = $1',
    [identifier]
  );
  const user = result.rows[0];

  if (user && await (bcrypt.compare(password, user.password))) {
    const token = generateToken(user);
    console.log(`${identifier} logged in successfully.`);
    res.status(200).json({
      name: identifier,
      token,
    });
  } else {
    res.status(401).json({
      message: 'Invalid credentaials. Try again.'
    });

  };
};


export const getUser = async (req, res) => {

  const { identifier } = req.body;

  const result = await db.query(
    'SELECT id, username, email, is_admin FROM users WHERE email = $1 or username = $1',
    [identifier]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(404).json('User does not exists.');
  } else {
    res.status(200).json({
      user
    });
  }
};


export const getAllUsers = async (req, res) => {
  const result = await db.query(
    'SELECT id, username, email, is_admin FROM users',
  );
  res.status(200).json(result.rows);
};


export const updateUser = async (req, res) => {
  const userId = req.user.id;
  const { username, email, password } = req.body;

  const result = await db.query(
    'SELECT username, email, password FROM users WHERE id = $1',
    [userId]
  );

  const current = result.rows[0];

  if (!current) {
    res.status(404);
    throw new Error('User not found.');
  };

  const newUsername = username || current.username;
  const newEmail = email || current.email;
  const newPassword = password ? await bcrypt.hash(password, 10) : current.password;

  const updated = await db.query(
    'UPDATE users SET username = $1, email = $2, password =$3 WHERE id = $4 RETURNING id, username, email, id_admin',
    [newUsername, newEmail, newPassword, userId]
  );

  const updatedUser = updated.rows[0];

  const token = generateToken(updatedUser);

  res.status(200).json({
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    isAdmin: updatedUser.is_admin,
    token,
  });
};

export const updatedUserByAdmin = async (req, res) => {
  const { username, email, isAdmin } = req.body;
  const { id } = req.params;

  const existing = await db.query(
    'SELECT username, email, is_admin, password FROM users WHERE id = $1',
    [id]
  );

  const currentUser = existing.rows[0];

  if (!currentUser) {
    res.status(404);
    throw new Error('User not found.');
  };

  const updatedUsername = username || currentUser.username;
  const updatedEmail = email || currentUser.email;
  const updatedIsAdmin = typeof isAdmin === 'boolean' ? isAdmin : currentUser.is_admin;

  const result = await db.query(
    `UPDATE users SET username = $1, email = $2, is_admin = $3 WHERE id = $4 RETURNING id, username, email, is_admin`,
    [updatedUsername, updatedEmail, updatedIsAdmin, id]
  );

  const updatedUser = result.rows[0];
  const token = generateToken(updatedUser);

  res.status(201).json({
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    isAdmin: updatedUser.is_admin,
    token,
  });
};


export const deleteUserByAdmin = async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    res.status(400);
    throw new Error('Admins cannot delete their own account.');
  }

  const userExists = await db.query(
    'SELECT id, username FROM users WHERE id = $1',
    [id]
  );

  if (userExists.rows.length === 0) {
    res.status(404);
    throw new Error('User not found.');
  };

  await db.query('DELETE FROM users WHERE id = $1', [id]);

  res.status(200).json({ message: `User ${id} (${userExists.rows[0].username}) deleted successfully.` });
};
