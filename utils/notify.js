import db from '../config/db.js';

export const logNotification = async (userId, message) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1,$2)`,
      [userId, message]
    );
  } catch (error) {
    console.log('Failed to log notifications.', error.message);
  };
};
