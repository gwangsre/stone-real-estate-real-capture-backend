import { Router } from 'express';
import { celebrate, Segments, Joi } from 'celebrate';
import * as Ctrl from '../controllers/messages.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import messageValidators from '../validators/message.schema.js';
import { db } from '../config/firebase.js';

const r = Router();

// Public endpoint: get the most recent message (for thank-you text)
r.get('/public-first', asyncHandler(async (_req, res) => {
  const snap = await db().collection('messages').orderBy('metadata.created_at', 'desc').limit(1).get();
  if (snap.empty) return res.json({ message: null });
  const doc = snap.docs[0];
  const data = doc.data();
  return res.json({ message: data.message, id: doc.id, created_at: data?.metadata?.created_at });
}));

r.post(
  '/',
  celebrate({ [Segments.BODY]: messageValidators.createBody }),
  asyncHandler(Ctrl.create)
);

r.get(
  '/',
  celebrate({ [Segments.QUERY]: messageValidators.listQuery }),
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
    [Segments.BODY]: messageValidators.updateBody,
  }),
  asyncHandler(Ctrl.update)
);

r.delete(
  '/:id',
  celebrate({ [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }) }),
  asyncHandler(Ctrl.remove)
);

export default r;
