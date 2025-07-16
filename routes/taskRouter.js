import express from 'express';
import { taskUpload } from '../middleware/uploadMiddleware.js';
import { protect, admin } from '../middleware/authMiddleware.js'
import { createTask, getTasksByUser, searchTaskByUser, updateTaskByUser, deleteTaskByUser, getAllTasksByAdmin, deleteTaskByAdmin } from '../controllers/taskController.js';

const router = express.Router();

router.post('/create-task', protect, taskUpload, createTask)

router.get('/', protect, getTasksByUser)

router.route('/:id')
  .put(protect, updateTaskByUser)
  .delete(protect, deleteTaskByUser)

router.route('/search')
  .get(protect, searchTaskByUser)

router.route('/admin/getalltasks')
  .get(protect, admin, getAllTasksByAdmin)

router.route('/admin/delete-task/:id')
  .delete(protect, admin, deleteTaskByAdmin)


export default router;
