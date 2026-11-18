import Joi from 'joi';
import { id, idParams } from './common.validator.js';
import { ASSIGNABLE_ROLES } from '../utils/roles.js';

const name = Joi.string().trim().min(1).max(100);
const description = Joi.string().trim().max(1000).allow('', null);
const role = Joi.string()
  .valid(...ASSIGNABLE_ROLES)
  .messages({ 'any.only': `role must be one of ${ASSIGNABLE_ROLES.join(', ')}` });

const memberParams = Joi.object({ id: id.required(), userId: id.required() });

export const workspaceIdSchema = { params: idParams };

export const createWorkspaceSchema = {
  body: Joi.object({ name: name.required(), description }),
};

export const updateWorkspaceSchema = {
  params: idParams,
  body: Joi.object({ name, description }).min(1),
};

export const addMemberSchema = {
  params: idParams,
  body: Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    role: role.default('MEMBER'),
  }),
};

export const updateMemberSchema = {
  params: memberParams,
  body: Joi.object({ role: role.required() }),
};

export const memberSchema = { params: memberParams };
