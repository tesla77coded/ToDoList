import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const result = await db.query(
        'SELECT id, username, email, is_admin FROM users WHERE id = $1',
        [decoded.id]
      );

      const user = result.rows[0];

      if (!user) {
        res.status(404);
        throw new Error('User not found in the database.');
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
      };
      next();

    } catch (err) {
      res.status(401);
      throw new Error("Invalid or expired token");
    };
  }

  if (!token) {
    res.status(401);
    return res.json({ message: 'Not authorized, no token found.' });
  }
}

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ message: 'Admin access only.' });
  };
};

export { protect, admin }
