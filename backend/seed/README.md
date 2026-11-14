# Data Contoh (Seeder)

`go run ./cmd/seed` (atau `docker compose exec backend /app/bin/seed`) membuat:

- 3 akun **penjual demo** (nama berakhiran "(Akun Demo)"), dengan password dari env `SEED_PASSWORD`.
- 8 listing rumah pertama dan menengah di Jawa Tengah (Rp 215 juta – 950 juta).
- Beberapa lead contoh (nama berakhiran "(Demo)").

Semua data ini **data contoh untuk demo**, bukan transaksi asli. Opsi tambahan:

- `SEED_WHATSAPP=62812xxxx`: nomor WhatsApp tim untuk tombol WA di listing demo. Default-nya nomor non-aktif, supaya tombol tidak mengirim pesan ke orang lain.
- `-replace-old-demo`: menghapus 6 listing villa mewah dari seeder versi lama.

## Panorama 360° contoh (opsional)

Cara yang disarankan adalah **merekam langsung** lewat fitur "Rekam Ruangan" di web yang sudah di-deploy (HTTPS).
Kalau sudah punya foto 360° equirectangular rasio 2:1 (misalnya dari kamera 360), taruh di:

```
seed/panoramas/<slug-listing>/01-ruang-tamu.jpg
seed/panoramas/<slug-listing>/02-kamar-utama.jpg
```

Seeder akan mengimpornya sebagai ruangan tur, selama listing tersebut belum punya ruangan.
