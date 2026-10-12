'use strict';

/* ASİSTAN — istemci mantığı */

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const state = {
  tasks: [],
  stats: {},
  filter: 'active',
  query: '',
};

const $ = (sel) => document.querySelector(sel);
const listEl = $('#list');
const emptyEl = $('#empty');

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function nowLocal() {
  const p = (n) => String(n).padStart(2, '0');
  const n = new Date();
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
}

function fmtDue(due) {
  if (!due) return '';
  const [date, time] = due.split('T');
  const [, m, d] = date.split('-');
  return `${Number(d)} ${AYLAR[Number(m) - 1]} ${time}`;
}

function isLate(t) {
  return !t.done && t.due && t.due < nowLocal();
}
function isToday(t) {
  return !t.done && t.due && t.due.slice(0, 10) === nowLocal().slice(0, 10);
}

/* ---------- Veri ---------- */

async function refresh() {
  try {
    const [tr, sr] = await Promise.all([fetch('/api/tasks'), fetch('/api/stats')]);
    state.tasks = (await tr.json()).tasks;
    state.stats = await sr.json();
    render();
  } catch (err) {
    console.error('Yenileme hatası:', err);
  }
}

async function api(path, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = 'Bir hata oluştu';
    try { msg = (await res.json()).error || msg; } catch (_) { /* yoksay */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

/* ---------- Render ---------- */

function render() {
  const s = state.stats;
  $('#stActive').textContent = `${s.active || 0} aktif`;
  $('#stToday').textContent = `${s.today || 0} bugün`;
  $('#stDone').textContent = `${s.done || 0} tamam`;
  const lateEl = $('#stLate');
  lateEl.textContent = `${s.late || 0} gecikmiş`;
  lateEl.classList.toggle('hidden', !(s.late > 0));

  const q = state.query.toLocaleLowerCase('tr');
  const visible = state.tasks.filter((t) => {
    if (state.filter === 'active' && t.done) return false;
    if (state.filter === 'done' && !t.done) return false;
    if (q && !(`${t.title} ${t.note}`.toLocaleLowerCase('tr').includes(q))) return false;
    return true;
  });

  listEl.innerHTML = visible
    .map((t) => {
      const late = isLate(t);
      const today = isToday(t);
      const dueCls = late ? 'late' : today ? 'today' : '';
      const dueTxt = t.due ? (late ? `⚠ ${fmtDue(t.due)}` : fmtDue(t.due)) : '';
      return `
        <li class="task${t.done ? ' done' : ''}${late ? ' late' : ''}" data-id="${t.id}">
          <button class="check" data-act="toggle" title="${t.done ? 'Geri al' : 'Tamamla'}">✓</button>
          <div class="body">
            <div class="title">${esc(t.title)}</div>
            <div class="meta">
              <span class="prio ${t.priority}">${t.priority === 'yuksek' ? 'Yüksek' : t.priority === 'dusuk' ? 'Düşük' : 'Orta'}</span>
              ${dueTxt ? `<span class="due ${dueCls}">${esc(dueTxt)}</span>` : ''}
              ${t.note ? `<span class="note">${esc(t.note)}</span>` : ''}
            </div>
          </div>
          <button class="del" data-act="del" title="Sil">🗑</button>
        </li>`;
    })
    .join('');

  if (visible.length === 0) {
    emptyEl.textContent = state.query
      ? 'Aramana uyan görev yok.'
      : state.filter === 'done'
        ? 'Henüz tamamlanan görev yok. Hadi başla! 💪'
        : 'Görev listesi boş. Yukarıdan ilk görevini ekle.';
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
  }
}

/* ---------- Eylemler ---------- */

$('#addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#addError');
  errEl.textContent = '';
  try {
    await api('/api/tasks', 'POST', {
      title: $('#fTitle').value,
      note: $('#fNote').value,
      priority: $('#fPriority').value,
      due: $('#fDue').value || null,
    });
    $('#fTitle').value = '';
    $('#fNote').value = '';
    $('#fDue').value = '';
    $('#fTitle').focus();
    await refresh();
    checkReminders();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.closest('.task').dataset.id;
  try {
    if (btn.dataset.act === 'toggle') await api(`/api/tasks/${id}/toggle`, 'POST');
    if (btn.dataset.act === 'del') {
      if (!confirm('Bu görev silinsin mi?')) return;
      await api(`/api/tasks/${id}`, 'DELETE');
    }
    await refresh();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.filter = tab.dataset.filter;
    render();
  });
});

$('#search').addEventListener('input', (e) => {
  state.query = e.target.value.trim();
  render();
});

/* ---------- Hatırlatıcılar ---------- */

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    [0, 0.28].forEach((off, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, start + off);
      gain.gain.exponentialRampToValueAtTime(0.25, start + off + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + off + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + off);
      osc.stop(start + off + 0.3);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch (_) { /* ses desteklenmiyorsa yoksay */ }
}

function toast(title, sub) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="t-title">⏰ ${esc(title)}</div>${sub ? `<div class="t-sub">${esc(sub)}</div>` : ''}`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

function fireReminder(t) {
  beep();
  toast(t.title, t.due ? `Saat ${t.due.split('T')[1]} — zamanı geldi` : '');
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('⏰ Asistan hatırlatıyor', { body: t.title }); } catch (_) { /* yoksay */ }
  }
}

async function checkReminders() {
  try {
    const res = await fetch('/api/reminders');
    const { reminders } = await res.json();
    for (const t of reminders) {
      fireReminder(t);
      await api(`/api/tasks/${t.id}/remind`, 'POST');
    }
  } catch (_) { /* bağlantı hatası — sonraki turda tekrar dene */ }
}

$('#bellBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    alert('Tarayıcın masaüstü bildirimlerini desteklemiyor.');
    return;
  }
  const perm = await Notification.requestPermission();
  $('#bellBtn').classList.toggle('on', perm === 'granted');
  if (perm === 'granted') toast('Bildirimler açık', 'Hatırlatıcılar masaüstünde de görünecek.');
});

/* ---------- Başlangıç ---------- */

refresh().then(checkReminders);
setInterval(checkReminders, 15000);
setInterval(refresh, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refresh();
    checkReminders();
  }
});
