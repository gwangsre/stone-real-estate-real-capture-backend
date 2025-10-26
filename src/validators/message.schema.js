import { Joi } from 'celebrate';

const createBody = Joi.object({
  message: Joi.string().min(2).max(1000).required(),
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()).default([]),
    custom_fields: Joi.object().unknown(true).default({}),
  }).default({}),
});

const updateBody = Joi.object({
  message: Joi.string().min(2).max(1000),
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
