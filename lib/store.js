'use strict';

/**
 * Görev deposu — data/tasks.json üzerinde çalışır.
 * Alanlar: id, title, note, priority, due, done, reminded, createdAt, completedAt
 * due biçimi: "YYYY-AA-GG SS:SS" (yerel saat, saniye yok)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'tasks.json');

const PRIORITIES = ['dusuk', 'orta', 'yuksek'];

let tasks = [];

function badRequest(msg) {
  const err = new Error(msg);
  err.status = 400;
  return err;
}

function notFound() {
  const err = new Error('Görev bulunamadı');
  err.status = 404;
  return err;
}

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        tasks = parsed.filter((t) => t && typeof t.id === 'string' && typeof t.title === 'string');
      }
    }
  } catch (err) {
    console.error('[store] tasks.json okunamadı:', err.message);
    tasks = [];
  }
}

function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (err) {
    console.error('[store] tasks.json yazılamadı:', err.message);
  }
}

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDue(due) {
  if (due === null || due === undefined || due === '') return null;
  if (typeof due !== 'string') throw badRequest('Geçersiz tarih biçimi');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(due)) {
    throw badRequest('Tarih biçimi YYYY-AA-GG SS:SS olmalı');
  }
  return due.slice(0, 16);
}

/** Yerel saatle "YYYY-AA-GG SS:SS" (kayıtlı due ile karşılaştırılabilir). */
function toLocalStr(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function add(input = {}) {
  const title = String(input.title || '').trim();
  if (!title) throw badRequest('Başlık boş olamaz');
  if (title.length > 200) throw badRequest('Başlık en fazla 200 karakter olabilir');

  const note = String(input.note || '').trim().slice(0, 500);
  let priority = String(input.priority || 'orta');
  if (!PRIORITIES.includes(priority)) priority = 'orta';
  const due = normalizeDue(input.due);

  const task = {
    id: newId(),
    title,
    note,
    priority,
    due,
    done: false,
    reminded: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.push(task);
  save();
  return task;
}

function update(id, input = {}) {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw notFound();

  if ('title' in input) {
    const title = String(input.title || '').trim();
    if (!title) throw badRequest('Başlık boş olamaz');
    t.title = title.slice(0, 200);
  }
  if ('note' in input) t.note = String(input.note || '').trim().slice(0, 500);
  if ('priority' in input && PRIORITIES.includes(input.priority)) t.priority = input.priority;
  if ('due' in input) {
    const due = normalizeDue(input.due);
    if (due !== t.due) {
      t.due = due;
      t.reminded = false; // yeni zamana geçince hatırlatıcı yeniden kurulur
    }
  }
  save();
  return t;
}

function toggle(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw notFound();
  t.done = !t.done;
  t.completedAt = t.done ? new Date().toISOString() : null;
  save();
  return t;
}

function remove(id) {
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);
  if (tasks.length === before) throw notFound();
  save();
  return true;
}

function markReminded(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw notFound();
  t.reminded = true;
  save();
  return t;
}

/** Sıralama: tamamlananlar en alta, aktiflerde önce yakın tarihler, öncelik eşitlik bozar. */
function list() {
  const pRank = { yuksek: 0, orta: 1, dusuk: 2 };
  return tasks
    .slice()
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.due ? 0 : 1) - (b.due ? 0 : 1) ||
        String(a.due || '').localeCompare(String(b.due || '')) ||
        pRank[a.priority] - pRank[b.priority] ||
        String(b.createdAt).localeCompare(String(a.createdAt))
    );
}

function get(id) {
  return tasks.find((t) => t.id === id) || null;
}

/** Zamanı geçmiş (gecikmiş) ve hatırlatması henüz yapılmamış görevler. */
function dueReminders(now = new Date()) {
  const nowStr = toLocalStr(now);
  return tasks.filter((t) => !t.done && !t.reminded && t.due && t.due <= nowStr);
}

function stats(now = new Date()) {
  const nowStr = toLocalStr(now);
  const today = nowStr.slice(0, 10);
  const out = { total: tasks.length, active: 0, done: 0, late: 0, today: 0 };
  for (const t of tasks) {
    if (t.done) {
      out.done += 1;
      continue;
    }
    out.active += 1;
    if (t.due && t.due < nowStr) out.late += 1;
    if (t.due && t.due.slice(0, 10) === today) out.today += 1;
  }
  return out;
}

load();

module.exports = {
  add,
  update,
  toggle,
  remove,
  markReminded,
  list,
  get,
  stats,
  dueReminders,
  toLocalStr,
  PRIORITIES,
};
