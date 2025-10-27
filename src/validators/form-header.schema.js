import Joi from "joi";

// Form Header validation schema
export const createFormHeaderBody = Joi.object({
  message: Joi.string().max(1000).required(),
  active: Joi.boolean().default(true)
}).options({ stripUnknown: false });

export const updateFormHeaderBody = Joi.object({
  message: Joi.string().max(1000),
  active: Joi.boolean()
}).min(1).options({ stripUnknown: false });

export default { createFormHeaderBody, updateFormHeaderBody };