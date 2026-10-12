'use strict';

process.env.DATA_DIR = require('fs').mkdtempSync(require('os').tmpdir() + require('path').sep + 'asistan-store-');

const assert = require('node:assert');
const { test } = require('node:test');
const store = require('../lib/store');

test('görev ekleme ve listeleme', () => {
  const t = store.add({ title: 'Test görevi', priority: 'yuksek' });
  assert.ok(t.id, 'id üretildi');
  assert.equal(t.done, false);
  assert.equal(t.priority, 'yuksek');
  assert.ok(store.list().some((x) => x.id === t.id), 'listede görünüyor');
});

test('boş başlık 400 döner', () => {
  assert.throws(() => store.add({ title: '   ' }), (e) => e.status === 400);
});

test('geçersiz tarih biçimi 400 döner', () => {
  assert.throws(() => store.add({ title: 'X', due: 'yarın' }), (e) => e.status === 400);
});

test('bilinmeyen öncelik varsayılana düşer', () => {
  const t = store.add({ title: 'Öncelik testi', priority: 'acil-acil' });
  assert.equal(t.priority, 'orta');
});

test('toggle: tamamla ve geri al', () => {
  const t = store.add({ title: 'Toggle görevi' });
  const a = store.toggle(t.id);
  assert.equal(a.done, true);
  assert.ok(a.completedAt, 'tamamlanma zamanı yazıldı');
  const b = store.toggle(t.id);
  assert.equal(b.done, false);
  assert.equal(b.completedAt, null);
});

test('silme ve 404', () => {
  const t = store.add({ title: 'Silinecek' });
  store.remove(t.id);
  assert.throws(() => store.remove(t.id), (e) => e.status === 404);
  assert.throws(() => store.toggle('boyle-bir-id'), (e) => e.status === 404);
  assert.throws(() => store.update('boyle-bir-id', { title: 'yok' }), (e) => e.status === 404);
});

test('due değişince reminded sıfırlanır', () => {
  const t = store.add({ title: 'Hatırlatıcı testi', due: '2026-01-01T10:00' });
  store.markReminded(t.id);
  assert.equal(store.get(t.id).reminded, true);
  store.update(t.id, { due: '2026-01-02T10:00' });
  assert.equal(store.get(t.id).reminded, false, 'yeni zamanda hatırlatıcı yeniden kuruldu');
});

test('dueReminders: zamanı gelen aktif görevler', () => {
  const past = store.add({ title: 'Geçmiş zaman', due: '2020-01-01T00:00' });
  const future = store.add({ title: 'Gelecek zaman', due: '2099-01-01T00:00' });
  let dueIds = store.dueReminders().map((t) => t.id);
  assert.ok(dueIds.includes(past.id), 'zamanı gelen geldi');
  assert.ok(!dueIds.includes(future.id), 'gelecekteki gelmedi');

  store.markReminded(past.id);
  dueIds = store.dueReminders().map((t) => t.id);
  assert.ok(!dueIds.includes(past.id), 'işaretlenen tekrar gelmez');

  store.toggle(past.id);
  assert.ok(!store.dueReminders().map((t) => t.id).includes(past.id), 'tamamlanan gelmez');
});

test('stats: toplam = aktif + tamam', () => {
  const s = store.stats();
  assert.ok(s.total >= 5);
  assert.equal(s.total, s.active + s.done);
  assert.ok(s.late >= 1, 'en az bir gecikmiş (2020 tarihli) var');
});
