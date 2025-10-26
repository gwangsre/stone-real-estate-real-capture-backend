import * as Messages from "../services/messages.service.js";

export async function create(req, res) {
  const data = await Messages.createMessage(req.body);
  return res.status(201).json(data);
}

export async function list(req, res) {
  const data = await Messages.listMessages(req.query);
  return res.json(data);
}

export async function getById(req, res) {
  const data = await Messages.getMessageById(req.params.id);
  if (!data) return res.status(404).json({ error: 'Not Found' });
  return res.json(data);
}

export async function update(req, res) {
  const data = await Messages.updateMessage(req.params.id, req.body);
  return res.json(data);
}

export async function remove(req, res) {
  const data = await Messages.deleteMessage(req.params.id);
  return res.json(data);
}
