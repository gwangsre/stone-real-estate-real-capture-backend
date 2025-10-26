import * as Admins from "../services/admins.service.js";

export async function create(req, res, next) {
  try {
    const data = await Admins.createAdmin(req.body);
    return res.status(201).json(data);
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

export async function list(req, res) {
  const data = await Admins.listAdmins(req.query);
  return res.json(data);
}

export async function getById(req, res) {
  const data = await Admins.getAdminById(req.params.id);
  if (!data) return res.status(404).json({ error: 'Not Found' });
  return res.json(data);
}

export async function update(req, res, next) {
  try {
    const data = await Admins.updateAdmin(req.params.id, req.body);
    return res.json(data);
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

export async function softDelete(req, res) {
  const data = await Admins.softDeleteAdmin(req.params.id);
  return res.json(data);
}
