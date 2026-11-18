import Joi from 'joi';
import { id, idParams, pagination, paginationQuery } from './common.validator.js';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
export const TASK_SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'title', 'status'];

const dateOnly = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
      ? helpers.error('date.invalid')
      : value;
  })
  .messages({
    'string.pattern.base': '{{#label}} must be a date in YYYY-MM-DD format',
    'date.invalid': '{{#label}} must be a valid date',
  });

const title = Joi.string().trim().min(1).max(200);
const description = Joi.string().trim().max(5000).allow('', null);
const status = Joi.string()
  .valid(...TASK_STATUSES)
  .messages({ 'any.only': `status must be one of ${TASK_STATUSES.join(', ')}` });

export const taskIdSchema = { params: idParams };

export const createTaskSchema = {
  body: Joi.object({
    projectId: id.required(),
    title: title.required(),
    description,
    status,
    assigneeId: id.allow(null),
    dueDate: dateOnly.allow(null),
  }),
};

export const updateTaskSchema = {
  params: idParams,
  body: Joi.object({
    title,
    description,
    status,
    assigneeId: id.allow(null),
    dueDate: dateOnly.allow(null),
  }).min(1),
};

export const listTasksSchema = {
  params: idParams,
  query: Joi.object({
    ...pagination,
    status,
    assigneeId: id,
    dueDate: dateOnly,
    dueFrom: dateOnly,
    dueTo: dateOnly,
    search: Joi.string().trim().max(100).allow(''),
    sortBy: Joi.string()
      .valid(...TASK_SORT_FIELDS)
      .default('createdAt'),
    order: Joi.string().lowercase().valid('asc', 'desc').default('desc'),
  }),
};

export const taskActivitySchema = {
  params: idParams,
  query: paginationQuery,
};
