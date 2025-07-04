import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { createUser, loginUser, getUser, getAllUsers, updateUser, updateUserByAdmin, deleteUserByAdmin } from '../controllers/userController.js';


const router = express.Router();

router.route('/')
  .post(createUser)
  .get(protect, admin, getAllUsers)

router.post('/login', loginUser)

router.route('/profile')
  .get(protect, getUser)
  .put(protect, updateUser)

router.route('/:id')
  .get(updateUserByAdmin)
  .delete(deleteUserByAdmin)

export default router;
