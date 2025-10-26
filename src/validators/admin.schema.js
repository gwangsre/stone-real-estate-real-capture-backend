import { Joi } from 'celebrate';

const name = Joi.string().min(2).max(50);
// Username accepted as provided; service layer normalizes to lowercase
const username = Joi.string().min(2).max(50).regex(/^[A-Za-z0-9._-]+$/, 'alphanumeric plus . _ -');
const password = Joi.string().min(2).max(50);
const email = Joi.string().email();

const createBody = Joi.object({
  username: username.required(),
  password: password.required(),
  first_name: name.required(),
  last_name: name.required(),
  email: email.required(),
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()).default([]),
    custom_fields: Joi.object().unknown(true).default({}),
  }).default({}),
});

const updateBody = Joi.object({
  username,
  password,
  first_name: name,
  last_name: name,
  email,
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()),
    custom_fields: Joi.object().unknown(true),
  }).unknown(false),
}).min(1);

const listQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

export default { createBody, updateBody, listQuery };
