'use strict';

process.env.DATA_DIR = require('fs').mkdtempSync(require('os').tmpdir() + require('path').sep + 'asistan-api-');

const assert = require('node:assert');
const { test, before, after } = require('node:test');
const { createApp } = require('../server');

let server;
let base;

before(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function post(path, body) {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('görev oluştur + listele', async () => {
  const res = await post('/api/tasks', { title: 'Entegrasyon görevi', priority: 'yuksek' });
  assert.equal(res.status, 201);
  const { task } = await res.json();
  assert.ok(task.id);

  const list = await (await fetch(`${base}/api/tasks`)).json();
  assert.ok(list.tasks.some((t) => t.id === task.id));
});

test('geçersiz istek 400 + hata mesajı', async () => {
  const res = await post('/api/tasks', { title: '   ' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error, 'hata mesajı var');
});

test('toggle → stats → delete akışı', async () => {
  const { task } = await (await post('/api/tasks', { title: 'Akış görevi' })).json();

  const toggled = await (await fetch(`${base}/api/tasks/${task.id}/toggle`, { method: 'POST' })).json();
  assert.equal(toggled.task.done, true);

  const stats = await (await fetch(`${base}/api/stats`)).json();
  assert.ok(stats.done >= 1, 'tamamlanan sayımı arttı');

  const del = await fetch(`${base}/api/tasks/${task.id}`, { method: 'DELETE' });
  assert.equal(del.status, 204);

  const again = await fetch(`${base}/api/tasks/${task.id}`, { method: 'DELETE' });
  assert.equal(again.status, 404, 'ikinci silme 404');
});

test('olmayan görevin toggle\'ı 404', async () => {
  const res = await fetch(`${base}/api/tasks/boyle-bir-id/toggle`, { method: 'POST' });
  assert.equal(res.status, 404);
});

test('remind işaretleme + /api/reminders', async () => {
  const { task } = await (await post('/api/tasks', { title: 'Geçmiş görev', due: '2020-05-05T12:00' })).json();

  const due = await (await fetch(`${base}/api/reminders`)).json();
  assert.ok(due.reminders.some((t) => t.id === task.id), 'zamanı gelen listede');

  const mark = await fetch(`${base}/api/tasks/${task.id}/remind`, { method: 'POST' });
  assert.equal(mark.status, 200);

  const after = await (await fetch(`${base}/api/reminders`)).json();
  assert.ok(!after.reminders.some((t) => t.id === task.id), 'işaretlenince listeden çıkar');
});

test('PUT ile güncelleme', async () => {
  const { task } = await (await post('/api/tasks', { title: 'Eski başlık' })).json();
  const res = await fetch(`${base}/api/tasks/${task.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Yeni başlık', priority: 'dusuk' }),
  });
  assert.equal(res.status, 200);
  const { task: updated } = await res.json();
  assert.equal(updated.title, 'Yeni başlık');
  assert.equal(updated.priority, 'dusuk');
});
