'use strict';

const express = require('express');
const path = require('path');
const store = require('./lib/store');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // ---- Görevler ----
  app.get('/api/tasks', (req, res) => {
    res.json({ tasks: store.list() });
  });

  app.post('/api/tasks', (req, res, next) => {
    try {
      res.status(201).json({ task: store.add(req.body || {}) });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/tasks/:id', (req, res, next) => {
    try {
      res.json({ task: store.update(req.params.id, req.body || {}) });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/tasks/:id', (req, res, next) => {
    try {
      store.remove(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/tasks/:id/toggle', (req, res, next) => {
    try {
      res.json({ task: store.toggle(req.params.id) });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/tasks/:id/remind', (req, res, next) => {
    try {
      res.json({ task: store.markReminded(req.params.id) });
    } catch (err) {
      next(err);
    }
  });

  // ---- İstatistikler & zamanı gelen hatırlatıcılar ----
  app.get('/api/stats', (req, res) => {
    res.json(store.stats());
  });

  app.get('/api/reminders', (req, res) => {
    res.json({ reminders: store.dueReminders() });
  });

  // ---- Hata yakalayıcı ----
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status || 500;
    if (status >= 500) console.error('[server]', err);
    res.status(status).json({ error: err.message || 'Sunucu hatası' });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3001;
  createApp().listen(port, () => {
    console.log('');
    console.log('  🤖 ASİSTAN — Görev & Hatırlatıcı');
    console.log(`   Adres : http://localhost:${port}`);
    console.log(`   Görev : ${store.list().length} kayıt yüklü`);
    console.log('');
  });
}

module.exports = { createApp };
