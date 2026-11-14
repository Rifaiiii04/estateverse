# Saran Berbasis Riset untuk EstateVerse: Hapus, Tambah, Perbaiki

> **Status: P1 + P2 SUDAH DIKERJAKAN** (H1–H4, T1–T3, P1–P5). Butir P3 (T4 panduan foto, T5 fakta rumah terstruktur, T6 pembanding harga/m², P6 blending multi-band) belum dikerjakan.

## Konteks
User meminta saran perubahan EstateVerse (fitur yang dihapus, ditambah, dan diperbaiki) yang **semuanya berdasar jurnal/paper ilmiah atau data resmi**. Saya menelusuri literatur dan data, lalu menyaring hanya yang sumbernya bisa diverifikasi. Tiap saran diberi **level bukti**:
- **[J]** jurnal peer-review
- **[WP]** working paper / preprint
- **[R]** regulasi / data resmi
- **[S]** survei atau data industri (bukan ilmiah, dipakai hanya sebagai pendukung)

**Temuan paling penting:** efek tur virtual terhadap **harga dan lama terjual tidak konsisten** antar studi:
- [Pant et al. 2020] harga +2%, tetapi waktu jual +6%
- [Yan et al. 2025] waktu jual 34 → 19 hari, tanpa efek harga
- [Soleymanian & Qian 2024] harga +1%, dan efeknya menurun setelah tur virtual jadi hal biasa

Artinya EstateVerse **tidak boleh menjanjikan "rumah lebih cepat laku/lebih mahal"**. Nilai jualnya harus pada (1) biaya pembuatan tur yang murah untuk penjual kecil, dan (2) pengukuran dampak dari data platform sendiri.

---

## A. HAPUS / HENTIKAN

| # | Yang dihapus | Dasar | Prioritas |
|---|---|---|---|
| H1 | **Klaim "laku lebih cepat/lebih mahal"** di teks, proposal, dan presentasi | Efek tur virtual tidak konsisten [J] Pant et al. 2020; [J] Yan et al. 2025; [WP] Soleymanian & Qian 2024 | P1 |
| H2 | **Label "≤30% gaji = aman" sebagai aturan.** Angka 30% bukan aturan OJK untuk KPR (batas 30% OJK berlaku untuk pinjol); bank umumnya memakai batas DSR sekitar 35–40% | [R] POJK 40/2024 & SEOJK 19/2025 (pinjol); [S] Cermati soal DSR bank; [J/WP] Stone: rasio tetap mengabaikan kebutuhan non-perumahan; [WP] Harvard JCHS 2021: standar 30% sering keliru menilai rumah tangga berpenghasilan tinggi dan kecil | P1 |
| H3 | **Label "subsidi" pada rentang < Rp 300 juta.** Batas harga rumah subsidi FLPP di Jawa 2024 adalah Rp166 juta (Rp166–240 juta tergantung zona), jadi label ini menyesatkan. Ganti jadi "Rumah pertama / terjangkau" | [R] Kepmen PUPR No. 689/KPTS/M/2023 | P1 |
| H4 | **LLM menghitung angka sendiri.** Angka harus dihitung oleh sistem; LLM hanya menjelaskan | [WP] Hean, Saha & Saha (arXiv 2412.19784): akurasi rata-rata sekitar 70% dan melemah untuk pertanyaan kompleks; [S] benchmark Saturn: 57% jawaban keuangan salah | P1 |

## B. TAMBAH

| # | Fitur baru | Dasar | Prioritas |
|---|---|---|---|
| T1 | **Peringatan keamanan transaksi + tombol "Laporkan iklan"** ("Jangan transfer uang sebelum survei dan cek sertifikat di BPN") | [J/WP] Studi NYU Tandon 2016: Craigslist hanya mendeteksi 47% iklan sewa palsu; [S] Rently 2024: 85% penyewa ingin verifikasi identitas pemilik | P1 |
| T2 | **Catatan & ukuran per ruangan di Walk Inside** (mis. "Kamar utama 3×3 m, jendela timur"), tampil di viewer | [J] CHI 2025 (Eagan et al.): tur dengan narasi terasa lebih kaya dan lebih diingat; [J] Israel, Zerres & Tscheulin 2019: telepresence panorama meningkatkan niat booking; [S] Rightmove: ukuran ruangan fitur denah paling dihargai pembeli | P2 |
| T3 | **Evaluasi dampak di dashboard:** rasio leads per kunjungan untuk iklan **dengan vs tanpa** Walk Inside (dari event yang sudah dicatat) | Karena literatur tidak konsisten, efek harus diukur sendiri; [J] Yan et al. 2025 juga memakai data platform | P2 |
| T4 | **Panduan foto listing:** checklist minimal (tampak depan + ruang utama) dan saran jumlah foto | [J] Benefield, Cain & Johnson 2011: tambahan foto menaikkan harga, tapi efeknya makin kecil; [WP] arXiv 2403.19915: foto meningkatkan akurasi prediksi harga | P3 |
| T5 | **Fakta rumah terstruktur** (sertifikat, daya listrik, sumber air, tahun dibangun) + bantuan asisten menulis deskripsi jujur | [J] Nowak & Smith 2017: teks listing menurunkan error estimasi harga lebih dari 25% | P3 |
| T6 | **Pembanding harga/m²**: median harga/m² listing serupa di kota yang sama, hanya tampil jika ada ≥ 5 data | [J] Kurlat & Stroebel 2015: pembeli yang kurang informasi dirugikan oleh asimetri informasi; [J] Bucchianeri & Minson 2013: harga tawaran menjadi jangkar harga jual | P3 |

## C. PERBAIKI

| # | Perbaikan | Dasar | Prioritas |
|---|---|---|---|
| P1 | **Kalkulator KPR jadi 2 ukuran:** (a) DSR = cicilan ÷ penghasilan, dibandingkan kisaran bank 35–40%; (b) **sisa uang per bulan** = penghasilan − cicilan − pengeluaran rutin (input baru) | [J/WP] Stone (residual income); [WP] Harvard JCHS 2021; [S] DSR bank | P1 |
| P2 | **Asisten:** backend membaca angka di pertanyaan, menghitung cicilan dan DSR dengan fungsi Go, lalu memasukkan hasilnya ke prompt sebagai "HASIL HITUNG SISTEM". LLM diwajibkan memakai angka itu dan tidak mengarang angka lain | [WP] Hean et al. (H4) | P1 |
| P3 | **Instruksi perekam 360:** yang benar "putar **HP di titik yang sama**", bukan "putar badan". Kalau HP bergerak melingkar, posisi lensa ikut berpindah sehingga muncul paralaks/ghosting. Tambahkan juga peringatan di layar. | [J] Brown & Lowe 2007 (IJCV): stitching mengasumsikan kamera berputar di pusat optiknya | P1 |
| P4 | **Viewer sesuai WCAG 2.2:** tombol arah dan zoom di layar sebagai alternatif selain drag (SC 2.5.7), target sentuh ≥ 24×24 px (SC 2.5.8) | [R] W3C WCAG 2.2 (Okt 2023) | P2 |
| P5 | **Kenyamanan viewer:** mode gyro tetap opsional (sudah), tanpa rotasi otomatis, zoom dibatasi | [J] Rebenitsch & Owen 2016: field of view dan navigasi berkorelasi dengan cybersickness; [J] scoping review Frontiers 2025 | P2 |
| P6 | **Blending multi-band** pada stitching (menggantikan feather) untuk mengurangi sambungan terlihat | [J] Brown & Lowe 2007 | P3 |

## Yang sudah tepat (pertahankan, untuk argumen proposal)
- **Tanpa perantara / tanpa komisi:** komisi agen 2–5% [R] Permendag 51/2017. FSBO menghasilkan harga yang tidak berbeda signifikan dengan MLS, tetapi penjualannya lebih lama [J] Hendel, Nevo & Ortalo-Magné 2009 (AER). Jadi klaimnya "hemat komisi", **bukan** "lebih cepat laku".
- **WhatsApp sebagai kanal utama:** dipakai 90,9% pengguna internet Indonesia [S] DataReportal/Meltwater 2024.
- **Mobile-first di browser:** penetrasi internet 79,5% [R] APJII 2024.
- **Tur berbasis panorama (bukan model 3D):** studi efek positif terkuat (Yan et al. 2025) memakai tur VR non-imersif, bukan model 3D. Ini mendukung Walk Inside 360 sebagai fitur utama.
- **Kompensasi exposure (gain) di stitching** sudah sesuai metode Brown & Lowe 2007.

## Data untuk bagian "Urgensi Masalah" di proposal (sudah dicek)
- **Backlog kepemilikan rumah:**
  - 9,9 juta rumah tangga (Susenas 2023, BPS). PUPR menyebutnya "indikasi", dan memakai angka 12,7 juta untuk tahun yang sama.
  - 9,87 juta (Susenas 2024)
  - 9,64 juta (Susenas Maret 2025)
  - sekitar 9,29 juta (Susenas Maret 2026)
- **Penetrasi internet:** 79,5% atau sekitar 221,5 juta jiwa (APJII 2024).
- **Rumah subsidi FLPP 2024:**
  - batas harga di Jawa Rp166 juta (Kepmen PUPR 689/2023)
  - batas penghasilan Rp8 juta per bulan (Kepmen PUPR 242/2020; ada usulan naik ke Rp12 juta, status belum pasti)
- **Komisi agen:** 2–5% dari nilai transaksi (Permendag 51/2017). Ada Permendag 33/2025 yang perlu dicek apakah mengubah batas ini.

---

## Rencana implementasi jika disetujui (P1 + P2; P3 hanya jika diminta)
1. **H1/H3**: audit teks di `frontend/src/lib/i18n/id.ts`/`en.ts`, `lib/utils/priceRanges.ts`, dan halaman lain. Tidak boleh ada klaim harga/kecepatan; label "subsidi" diganti "terjangkau".
2. **H2 + P1**:
   - `lib/utils/mortgage.ts`: tambah `debtServiceRatio()` dan `residualIncome()`. `assessAffordability` memakai DSR, dengan ambang "nyaman" ≤ 30% (patokan perencanaan), "batas bank" 30–40%, dan "berisiko" > 40%, semuanya diberi label sumber.
   - `PropertyMortgageCard.tsx`: input pengeluaran rutin dan tampilan "sisa uang per bulan".
   - Sesuaikan `consultantAdvisor.ts`, `AiConsultantSection.tsx`, dan aturan 3 di `backend/internal/services/assistant_prompt.go`.
3. **H4 + P2**:
   - `backend/internal/services/assistant_math.go` (baru): parse nominal Rupiah, hitung cicilan anuitas dan DSR
   - `assistant_service.go`: sisipkan "HASIL HITUNG SISTEM" ke prompt
   - tes `assistant_math_test.go`
4. **P3**: teks di `components/capture/CapturePanels.tsx` dan `CaptureOverlay.tsx` (hint) jadi "Pegang HP di depan mata dan putar HP di titik yang sama". Tambah peringatan jika gerakan tidak hanya rotasi. Tanpa sensor posisi, peringatan cukup lewat teks.
5. **T1**:
   - kartu keamanan di halaman detail dan setelah kirim lead
   - endpoint `POST /api/v1/reports` (rate-limited) + migrasi `011_create_listing_reports.sql` + tampilan jumlah laporan di dashboard penjual
6. **T2**:
   - migrasi `012_add_tour_room_note.sql` (`note VARCHAR(160)`)
   - ubah nama/catatan di `TourRoomCard.tsx`
   - catatan tampil di `TourViewer.tsx`
7. **T3**: kueri di `engagement_repo.go`: leads per view, dikelompokkan berdasarkan ada/tidaknya Walk Inside. Ditampilkan di `dashboard/analytics/page.tsx`.
8. **P4/P5**:
   - tombol ←/→/↑/↓/+/− di `TourViewer.tsx` (≥ 44 px)
   - cek ukuran target pada tombol kecil
   - tidak ada auto-rotate
9. Perbarui `README.md` dengan bagian "Dasar Riset" berisi daftar referensi di bawah.

## Verifikasi
- `go test ./...` (termasuk tes baru `assistant_math`, laporan, catatan ruangan), `npx eslint src`, `npx tsc --noEmit`, `npm run build`.
- E2E dengan MySQL sementara:
  - kalkulator menampilkan DSR dan sisa uang
  - pertanyaan asisten "rumah 350 juta gaji 6 juta" menghasilkan prompt berisi angka hitungan sistem (dicek lewat tes `httptest`)
  - laporan iklan tersimpan
  - catatan ruangan tampil di viewer
- `grep` teks: tidak ada "subsidi" pada label harga dan tidak ada klaim "lebih cepat laku".

## Referensi (semua dicek lewat pencarian)
- Pant, Yu, Ma & Hu (2020), *J. Real Estate Literature* 28(2):133–149. [experts.illinois.edu](https://experts.illinois.edu/en/publications/the-effect-of-virtual-tours-on-house-price-and-time-on-market/) · [ringkasan Tippie](https://tippie.uiowa.edu/node/2741)
- Yan, Meng & Tan (2025), *Information Systems Research* 36(2):1011–1030, doi:10.1287/isre.2021.9138. [IDEAS](https://ideas.repec.org/a/inm/orisre/v36y2025i2p1011-1030.html) · [UT Dallas](https://news.utdallas.edu/business-management/virtual-reality-tours-real-estate-2025)
- Soleymanian & Qian (2024), "From Novelty to Norm", NBER WP 33204. [nber.org](https://nber.org/papers/w33204)
- Benefield, Cain & Johnson (2011), *J. Real Estate Finance & Economics* 43(3):401–422. [Springer](https://link.springer.com/article/10.1007/s11146-009-9219-6)
- Hendel, Nevo & Ortalo-Magné (2009), *American Economic Review* 99(5):1878–1898. [NBER w13360](https://www.nber.org/papers/w13360.pdf)
- Kurlat & Stroebel (2015), *Review of Financial Studies* 28(8):2429–2461. [NBER w19875](https://www.nber.org/papers/w19875)
- Bucchianeri & Minson (2013), *J. Economic Behavior & Organization* 89:76–92. [IDEAS](https://ideas.repec.org/a/eee/jeborg/v89y2013icp76-92.html)
- Nowak & Smith (2017), *J. Applied Econometrics* 32(4):896–918. [EconPapers](https://econpapers.repec.org/RePEc:wly:japmet:v:32:y:2017:i:4:p:896-918)
- Stone, residual income / shelter poverty. [bepress](https://works.bepress.com/michael_stone/7/) · Airgood-Obrycki et al. (2021), Harvard JCHS. [PDF](https://jchs.harvard.edu/sites/default/files/research/files/harvard_jchs_rent_eats_first_airgood-obrycki_hermann_wedeen_2021.pdf)
- Hean, Saha & Saha, "Can AI Help with Your Personal Finances?", arXiv 2412.19784. [arXiv](https://arxiv.org/abs/2412.19784) · Benchmark Saturn (industri). [Tom's Guide](https://www.tomsguide.com/ai/ai-could-be-costing-you-money-new-study-finds-chatbots-get-most-financial-questions-wrong)
- Brown & Lowe (2007), *Int. J. Computer Vision*, doi:10.1007/s11263-006-0002-3. [Springer PDF](https://link.springer.com/content/pdf/10.1007/s11263-006-0002-3.pdf)
- Rebenitsch & Owen (2016), review cybersickness, *Virtual Reality*. [Springer PDF](https://link.springer.com/content/pdf/10.1007%2Fs10055-016-0285-9.pdf) · Scoping review panoramic XR (2025), doi:10.3389/frvir.2025.1622605
- Israel, Zerres & Tscheulin (2019), *J. Hospitality & Tourism Technology*. [Emerald](https://emerald.com/insight/content/doi/10.1108/JHTT-03-2018-0020/full/html) · Eagan et al. (CHI 2025), narrated VR tour. [PDF](https://hci.otago.ac.nz/papers/EaganCHI2025.pdf)
- Studi scam Craigslist, NYU Tandon (2016). [phys.org](https://phys.org/news/2016-03-craigslist-scam-rental.pdf) · Survei Rently 2024 [S]. [Florida Realtors](https://floridarealtors.org/news-media/news-articles/2024/12/renters-fear-scams-tight-housing-market) · Livingston & Scholten (2019), *Review of Industrial Organization* 54(3). [IDEAS](https://ideas.repec.org/a/kap/revind/v54y2019i3d10.1007_s11151-018-9655-7.html)
- Denah (survei industri [S]): [Zillow](https://www.zillow.com/agents/virtual-and-in-person-tours-important-for-buyers) · [Rightmove](https://www.rightmove.co.uk/news/articles/property-news/maximise-chances-finding-buyer-floorplan/)
- W3C WCAG 2.2 (5 Okt 2023). [w3.org](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- Backlog (BPS/PUPR): [Fortune IDN](https://www.fortuneidn.com/business/sulit-punya-rumah-backlog-perumahan-berpotensi-bertambah-00-my5jv-hxhxfj) · [Info Singkat DPR Mei 2025](https://berkas.dpr.go.id/pusaka/files/info_singkat/Info%20Singkat-XVII-9-I-P3DI-Mei-2025-172.pdf) · [Kontan 2026](https://nasional.kontan.co.id/news/bps-mencatat-sebanyak-929-juta-keluarga-belum-memiliki-rumah)
- APJII 2024: [SWA](https://swa.co.id/read/442478/penetrasi-internet-indonesia-capai-795-dari-total-populasi-penduduk) · WhatsApp 90,9%: [Meltwater](https://www.meltwater.com/en/blog/social-media-statistics-indonesia) · [DataReportal](https://datareportal.com/reports/digital-2024-indonesia)
- Komisi 2–5%: [Rumah123 (Permendag 51/2017)](https://www.rumah123.com/panduan-properti/?p=147574) · [Bisnis.com AREBI](https://ekonomi.bisnis.com/read/20171008/107/697084/arebi-komisi-broker-sudah-ideal)
- FLPP: [Kepmen 689/2023 (industry.co.id)](https://www.industry.co.id/read/123111/menteri-basuki-tetapkan-batasan-harga-jual-rumah-subsidi-tahun-2023-2024) · [Batas penghasilan (detik)](https://finance.detik.com/infrastruktur/d-7582345/menanti-realisasi-pekerja-bergaji-rp-12-juta-bisa-beli-rumah-subsidi)
- DSR: [Cermati](https://www.cermati.com/artikel/amp/debt-service-ratio) · OJK 30% untuk pinjol: [Kabar Bursa](https://www.kabarbursa.com/makro/berlaku-2026-ojk-rem-pinjol-batas-utang-30-persen-dari-penghasilan)

**Catatan kejujuran:**
- Beberapa paper hanya saya baca dari abstrak atau ringkasan (full text berbayar), jadi angka detailnya perlu dicek ulang sebelum dikutip di proposal.
- Studi Anderson, Freybote & Manis 2022 tidak saya pakai karena tidak berhasil diverifikasi.
- Data bertanda [S] bukan publikasi ilmiah, sebaiknya tidak dijadikan argumen utama.
