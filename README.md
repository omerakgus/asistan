# 🤖 Asistan — Görev & Hatırlatıcı

Koyu temalı, sade ve hızlı bir **görev + hatırlatıcı** uygulaması. Yerel çalışır, veriler `data/tasks.json` dosyasında saklanır, hesap/üyelik gerektirmez.

## Özellikler

- ✅ Görev ekleme: başlık, not, öncelik (düşük/orta/yüksek), **tarih-saat**
- ⏰ **Hatırlatıcı**: zamanı gelince sayfadında bildirim + sesli bip + masaüstü bildirimi (izin verilirse)
- ✅ Tamamlandı işaretleme / geri alma
- 🔍 Arama + sekmeli filtre (Aktif / Tamamlanan / Hepsi)
- 📊 Üst bantta canlı sayaçlar: aktif, bugün, tamamlanan, gecikmiş
- 🎨 Koyu tema, Poppins fontu, mobil uyumlu
- 🔁 Otomatik yenileme (30 sn) + sekme odaklanınca tazeleme

## Kurulum

```bash
npm install
npm start        # http://localhost:3001
```

Port değiştirmek için: `PORT=4000 npm start`

## Test

```bash
npm test         # store + API testleri (node --test)
```

## API

| Yöntem | Uç | Açıklama |
|---|---|---|
| GET | `/api/tasks` | Görev listesi (sıralı) |
| POST | `/api/tasks` | Ekle `{title, note?, priority?, due?}` |
| PUT | `/api/tasks/:id` | Güncelle |
| DELETE | `/api/tasks/:id` | Sil |
| POST | `/api/tasks/:id/toggle` | Tamamla / geri al |
| POST | `/api/tasks/:id/remind` | Hatırlatıcı yapıldı olarak işaretle |
| GET | `/api/stats` | `{total, active, done, late, today}` |
| GET | `/api/reminders` | Zamanı gelmiş, hatırlatılmamış görevler |

`due` biçimi: `YYYY-AA-GG SS:SS` (yerel saat).

## Teknoloji

Node.js · Express · vanilla JS/CSS · JSON dosya deposu

## Lisans

MIT
