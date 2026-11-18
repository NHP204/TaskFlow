import Joi from 'joi';

export const id = Joi.number().integer().positive().max(2147483647);

export const idParams = Joi.object({ id: id.required() });

export const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

export const paginationQuery = Joi.object(pagination);
