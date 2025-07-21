import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'
import { generateToken, generateEmailToken, generateResetToken } from "../utils/generateToken.js";
import db from '../config/db.js'
import { logNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/sendEmail.js";

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

  console.log('User created:', result.rows[0]);

  const newUser = result.rows[0];
  const token = generateToken(newUser);


  const emailToken = generateEmailToken(newUser.id);
  const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${emailToken}`;
  console.log('Email confirmation token:', emailToken);

  await sendEmail(
    newUser.email,
    'Confirm your email',
    `Hi ${newUser.username},\n\nPlease confirm your email by clicking the link below: \n\n${confirmUrl}`
  );

  res.status(201).json({
    message: 'User registered successfully.',
    user: {
      id: newUser.id,
      user: newUser.username,
      email: newUser.email,
      isadmin: newUser.is_admin,
    },
    token,
    ...(process.env.NODE_ENV === 'test' && { confirmationToken: emailToken }) // 🔐 only include token in test env
  });
};


export const confirmEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Decoded Token:', decoded); // DEBUG LOG

    const userId = decoded.userId;
    console.log('🔍 Extracted userId:', userId); // DEBUG LOG

    const userRes = await db.query('SELECT verified FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.verified) {
      return res.status(400).json({ message: 'Email already verified.' });
    }

    await db.query('UPDATE users SET verified = true WHERE id = $1', [userId]);

    return res.status(200).json({ message: 'Email verified successfully.' });

  } catch (err) {
    console.error('❌ JWT verification failed:', err.message); // DEBUG LOG
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const result = await db.query(
    `SELECT id, username FROM users WHERE email = $1`, [email]
  );

  const user = result.rows[0];

  if (!user) {
    res.status(404);
    throw new Error('User not registered.');
  }

  const resetToken = generateResetToken(user.id);
  console.log(`The password reset token for ${user.id} is: ${resetToken}`);
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await sendEmail(
    email,
    'Reset the password.',
    `Hi ${user.username},\n\nReset your password by clicking the link below:\n\n${resetLink}`
  );


  // 👇 Include the token only when testing
  if (process.env.NODE_ENV === 'test') {
    return res.status(200).json({
      message: 'Password reset link sent.',
      resetToken, // 🧪 Add this for test usage
    });
  }

  res.status(200).json({ message: 'Password reset link sent.' });

}


export const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, userId]);
    res.status(200).json({ message: 'Password reset successfully.' });

  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token.' });
  };
};


export const loginUser = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: "Request body missing." });
  }

  const { identifier, password } = req.body;

  const result = await db.query(
    'SELECT * FROM users WHERE username = $1 OR email = $1',
    [identifier]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ message: 'User not found. Please register.' });
  }

  console.log('User verified status:', user.verified);

  if (!user.verified) {
    return res.status(401).json({ message: 'Please verify your email first.' });
  }

  if (user && await bcrypt.compare(password, user.password)) {
    const token = generateToken(user);
    console.log(`${identifier} logged in successfully.`);
    res.status(200).json({
      name: identifier,
      token,
    });
  } else {
    res.status(401).json({
      message: 'Invalid credentials. Try again.'
    });
  }
};


export const getUser = async (req, res) => {

  const user = req.user

  res.status(200).json({
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
  });

};


export const getAllUsers = async (req, res) => {
  console.log('🔥 getAllUsers called by:', req.user); // Add this

  try {
    const result = await db.query('SELECT id, username, email, is_admin FROM users ORDER BY id');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error in getAllUsers:', err); // Add this
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateUser = async (req, res) => {
  const userId = req.user.id;
  const { username, email, password } = req.body;

  const result = await db.query(
    `SELECT username, email, password FROM users WHERE id = $1`, [userId]
  );

  const current = result.rows[0];

  if (!current) {
    res.status(404);
    throw new Error('User not found.');
  }

  const newUsername = username || current.username;
  const newEmail = email || current.email;

  const passwordChanged = !!password;
  const emailChanged = email && email !== current.email;

  const newPassword = passwordChanged
    ? await bcrypt.hash(password, 10)
    : current.password;

  const updated = await db.query(`
    UPDATE users SET username = $1, email = $2, password = $3 WHERE id = $4 RETURNING id, username, email, is_admin
  `, [newUsername, newEmail, newPassword, userId])

  const updatedUser = updated.rows[0];
  const token = generateToken(updatedUser);

  // ✅ Notify user if password was changed
  if (passwordChanged) {
    await sendEmail(
      newEmail,
      'Your password has changed.',
      `Hi ${newUsername},\n\nThis is a confirmation that your password was recently changed.`
    );
  }

  // Notify user if email was changed
  if (emailChanged) {
    await sendEmail(
      newEmail,
      'Your email was changed.',
      `Hi ${newUsername},\n\nThis is a confirmation that your email was recently changed.`
    );
  }

  res.status(200).json({
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    isAdmin: updatedUser.is_admin,
    token,
  });

};


export const getUserNotifications = async (req, res) => {
  try {
    const result = await db.query(
      `
     SELECT * FROM notifications WHERE id = $1 ORDER BY created_at DESC 
    `, [req.user.id]);

    res.status(200).json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
}


export const updateUserByAdmin = async (req, res) => {

  const { username, email, isAdmin } = req.body;
  const { id } = req.params;

  console.log('🛠️ Admin updating user:', req.params.id);

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
  await logNotification(id, 'Your profile was updated by an admin.');
  const token = generateToken(updatedUser);

  await sendEmail(
    updatedUser.email,
    'Your account was updated by admin.',
    `Hi ${updatedUser.username}, \n\n An admin has updated your account information.If this was unexpected contact support.`
  )

  res.status(200).json({
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
