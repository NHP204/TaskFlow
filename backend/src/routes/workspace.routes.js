import { Router } from 'express';
import validate from '../middlewares/validate.js';
import {
  addMemberSchema,
  createWorkspaceSchema,
  memberSchema,
  updateMemberSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from '../validators/workspace.validator.js';

export default function createWorkspaceRouter({ workspaceController: c, authenticate }) {
  const router = Router();

  router.use(authenticate);

  router.post('/', validate(createWorkspaceSchema), c.create);
  router.get('/', c.list);
  router.get('/:id', validate(workspaceIdSchema), c.getById);
  router.patch('/:id', validate(updateWorkspaceSchema), c.update);
  router.delete('/:id', validate(workspaceIdSchema), c.delete);

  router.post('/:id/members', validate(addMemberSchema), c.addMember);
  router.patch('/:id/members/:userId', validate(updateMemberSchema), c.updateMember);
  router.delete('/:id/members/:userId', validate(memberSchema), c.removeMember);

  return router;
}
