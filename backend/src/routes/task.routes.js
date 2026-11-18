import { Router } from 'express';
import validate from '../middlewares/validate.js';
import {
  createTaskSchema,
  taskActivitySchema,
  taskIdSchema,
  updateTaskSchema,
} from '../validators/task.validator.js';

export default function createTaskRouter({ taskController: c, authenticate }) {
  const router = Router();

  router.use(authenticate);

  router.post('/', validate(createTaskSchema), c.create);
  router.get('/:id', validate(taskIdSchema), c.getById);
  router.patch('/:id', validate(updateTaskSchema), c.update);
  router.delete('/:id', validate(taskIdSchema), c.delete);
  router.get('/:id/activity', validate(taskActivitySchema), c.listActivity);

  return router;
}
