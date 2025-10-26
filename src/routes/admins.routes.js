import { Router } from 'express';
import { celebrate, Segments, Joi } from 'celebrate';
import * as Ctrl from '../controllers/admins.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import adminValidators from '../validators/admin.schema.js';

const r = Router();

r.post(
  '/',
  celebrate({ [Segments.BODY]: adminValidators.createBody }),
  asyncHandler(Ctrl.create)
);

r.get(
  '/',
  celebrate({ [Segments.QUERY]: adminValidators.listQuery }),
  asyncHandler(Ctrl.list)
);

r.get(
  '/:id',
  celebrate({ [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }) }),
  asyncHandler(Ctrl.getById)
);

r.patch(
  '/:id',
  celebrate({
    [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }),
    [Segments.BODY]: adminValidators.updateBody,
  }),
  asyncHandler(Ctrl.update)
);

r.delete(
  '/:id',
  celebrate({ [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }) }),
  asyncHandler(Ctrl.softDelete)
);

export default r;
