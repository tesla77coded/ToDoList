import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { createUser, confirmEmail, forgotPassword, resetPassword, loginUser, getUser, getUserNotifications, getAllUsers, updateUser, updateUserByAdmin, deleteUserByAdmin } from '../controllers/userController.js';

const router = express.Router();

router.route('/')
  .post(createUser)

router.get('/confirm-email', confirmEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/user-notifications', protect, getUserNotifications);
router.put('/update-profile', protect, updateUser)

router.post('/login', loginUser);

router.route('/profile')
  .get(protect, getUser)

router.get('/allUserProfiles', protect, admin, getAllUsers)

router.route('/:id')
  .get(protect, admin, updateUserByAdmin)
  .delete(protect, admin, deleteUserByAdmin)

export default router;
