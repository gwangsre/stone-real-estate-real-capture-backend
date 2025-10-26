import Joi from "joi";

// Allowed suburbs - extend as needed
export const ALLOWED_SUBURBS = [
  "Hornsby",
  "Asquith",
  "Waitara",
  "Hornsby Heights",
  "Mount Colah",
  "Mount Kuring-gai",
  "Berowra",
  "Berowra Heights",
  "Wahroonga",
  "Turramurra",
  "Pennant Hills",
  "Thornleigh",
  "Normanhurst",
];

// Public form schema
export const createPublicBody = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  // Australian mobile phone pattern: +614xxxxxxxx or 04xxxxxxxx
  phone: Joi.string().pattern(/^(?:\+61|0)4\d{8}$/).required(),
  preferred_contact: Joi.string().valid("email", "phone", "both").default("both"),
  suburb: Joi.string().valid(...ALLOWED_SUBURBS).required(),
  timeframe: Joi.string().valid("1-3 months", "3-6 months", "6+ months", "not sure").required(),
  // selling interest (existing)
  interested: Joi.string().valid("yes", "no").required(),

  // NEW: buying interest: accept either name the frontend might send
  interested_buying: Joi.string().valid("yes", "no").optional(),
  buying: Joi.string().valid("yes", "no").optional(),

  // optional tracking
  utm_source: Joi.string().allow("", null),
  utm_medium: Joi.string().allow("", null),
  utm_campaign: Joi.string().allow("", null),
}).options({ stripUnknown: false });

export const statusBody = Joi.object({
  status: Joi.string().required(),
  notes: Joi.string().allow("", null),
  changed_by: Joi.string().required(),
});

// Generic update of a lead (contact/status/metadata)
const contactShape = Joi.object({
  first_name: Joi.string().min(2).max(50),
  last_name: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^(?:\+61|0)4\d{8}$/),
  preferred_contact: Joi.string().valid("email", "phone", "both"),
  suburb: Joi.string().valid(...ALLOWED_SUBURBS),
  timeframe: Joi.string().valid("1-3 months", "3-6 months", "6+ months", "not sure"),
  selling_interest: Joi.boolean(),
  buying_interest: Joi.boolean(),
  score: Joi.number().integer().min(0),
}).unknown(false);

const statusUpdateShape = Joi.object({
  current: Joi.string(),
  notes: Joi.string().allow("", null),
  changed_by: Joi.string(),
}).unknown(false);

const metadataShape = Joi.object({
  // created_at will be preserved by server
  updated_at: Joi.any().forbidden(),
  deleted_at: Joi.any(),
  version: Joi.number().integer(),
  tags: Joi.array().items(Joi.string()),
  custom_fields: Joi.object().unknown(true),
}).unknown(false);

export const updateLeadBody = Joi.object({
  contact: contactShape.optional(),
  status: statusUpdateShape.optional(),
  metadata: metadataShape.optional(),
}).min(1);

export default { ALLOWED_SUBURBS, createPublicBody, statusBody, updateLeadBody };