import { Router } from 'express';
import validate from '../middlewares/validate.js';
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from '../validators/project.validator.js';

export default function createProjectRouter({ projectController: c, authenticate }) {
  const router = Router();

  router.use(authenticate);

  router.post('/', validate(createProjectSchema), c.create);
  router.get('/:id', validate(projectIdSchema), c.getById);
  router.patch('/:id', validate(updateProjectSchema), c.update);
  router.delete('/:id', validate(projectIdSchema), c.delete);

  return router;
}
