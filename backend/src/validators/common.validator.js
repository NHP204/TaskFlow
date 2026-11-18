import Joi from 'joi';

export const id = Joi.number().integer().positive().max(2147483647);

export const idParams = Joi.object({ id: id.required() });
