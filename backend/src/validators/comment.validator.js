import Joi from 'joi';
import { idParams, paginationQuery } from './common.validator.js';

const body = Joi.object({ content: Joi.string().trim().min(1).max(2000).required() });

export const createCommentSchema = { params: idParams, body };
export const updateCommentSchema = { params: idParams, body };
export const commentIdSchema = { params: idParams };
export const listCommentsSchema = { params: idParams, query: paginationQuery };
