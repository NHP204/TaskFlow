import { Router } from 'express';
import validate from '../middlewares/validate.js';
import { commentIdSchema, updateCommentSchema } from '../validators/comment.validator.js';

export default function createCommentRouter({ commentController: c, authenticate }) {
  const router = Router();

  router.use(authenticate);

  router.patch('/:id', validate(updateCommentSchema), c.update);
  router.delete('/:id', validate(commentIdSchema), c.delete);

  return router;
}
