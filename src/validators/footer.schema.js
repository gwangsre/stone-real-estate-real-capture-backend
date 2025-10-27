import Joi from "joi";

// Footer validation schema
export const createFooterBody = Joi.object({
  message: Joi.string().max(1000).required(),
  active: Joi.boolean().default(true)
}).options({ stripUnknown: false });

export const updateFooterBody = Joi.object({
  message: Joi.string().max(1000),
  active: Joi.boolean()
}).min(1).options({ stripUnknown: false });

export default { createFooterBody, updateFooterBody };