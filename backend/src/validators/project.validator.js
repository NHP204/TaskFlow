import Joi from 'joi';
import { id, idParams } from './common.validator.js';

const name = Joi.string().trim().min(1).max(100);
const description = Joi.string().trim().max(2000).allow('', null);

export const projectIdSchema = { params: idParams };

export const createProjectSchema = {
  body: Joi.object({ workspaceId: id.required(), name: name.required(), description }),
};

export const updateProjectSchema = {
  params: idParams,
  body: Joi.object({ name, description }).min(1),
};
