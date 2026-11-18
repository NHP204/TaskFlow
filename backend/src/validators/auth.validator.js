import Joi from 'joi';

const email = Joi.string().trim().lowercase().email().max(255).required();

export const registerSchema = {
  body: Joi.object({
    email,
    // bcrypt only uses the first 72 bytes
    password: Joi.string().min(8).max(72).required(),
    fullName: Joi.string().trim().min(1).max(100).required(),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email,
    password: Joi.string().required(),
  }),
};
