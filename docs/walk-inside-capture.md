# Walk Inside 360° dengan kamera panorama

## Merekam satu ruangan

1. Buka **Rekam Ruangan** pada HP. Di web, gunakan HTTPS dan izinkan kamera serta sensor gerak.
2. Berdiri di satu posisi dan pegang kamera belakang tegak setinggi mata. Awali dari pintu, kusen, atau area lain yang punya detail untuk pengukuran lensa. Putar perlahan ke kanan. Pertahankan posisi lensa saat memutar badan agar objek dekat tetap sejajar.
3. Ikuti pratinjau sampai satu putaran selesai. Gambar pertama berisi panorama setinggi mata. Arahkan kamera ke atas untuk putaran berikutnya, lalu ke bawah sesuai panduan. Kamera dengan bidang pandang vertikal lebar menghasilkan **3 gambar panorama**. Lensa yang lebih sempit menghasilkan **5 gambar** agar plafon dan lantai ikut terlihat.
4. Jika suatu bagian terlewat, ikuti arahan untuk kembali dan mengisinya. Perekam memeriksa piksel yang terisi hingga ke tepi setiap gambar. Cahaya merata dan ruangan tanpa orang bergerak membantu menjaga detail sambungan.
5. Beri nama ruangan dan simpan. Pada iklan baru, simpan properti untuk mengirim panorama. Setelah pemrosesan selesai, buka Walk Inside dan periksa kusen pintu, plafon, lantai, dan sambungan antara awal dan akhir putaran.

## Dari kamera sampai ke viewer

Web mengambil sampel video kamera belakang. Jika browser menyediakan waktu pengambilan gambar, perekam mencocokkannya dengan riwayat orientasi HP supaya jeda pratinjau tidak menggeser sambungan. Mobile memperkirakan arah kamera dari pembacaan sensor selama rana bekerja dan menghapus foto sementara setelah diproses. Selama putaran pertama, kedua klien mengukur sudut lensa dari area yang bertumpuk. Setiap sampel berikutnya diperiksa terhadap gambar dan orientasi kamera, lalu pikselnya diproyeksikan ke panorama yang sedang dibuat. Satu putaran lengkap menghasilkan satu JPEG dengan cakupan horizontal 360°.

Klien mengirim `POST /api/v1/tours/captures` dengan `property_id`, manifest `meta`, dan satu berkas `frame_i` per putaran. Manifest `bands` memuat `index`, `pitch`, `min_pitch`, dan `max_pitch` dalam derajat. Sisi atas JPEG berada di `max_pitch`. Semua gambar dalam satu ruangan memakai lebar dan arah depan yang sama. Dua gambar yang bersebelahan berbagi sebagian area vertikal.

Web dan mobile memberi setiap rekaman baru satu UUIDv4 di `meta.capture_id` dan mengirim ID yang sama saat mengulang unggahan. Migrasi MySQL 019 menyimpan ID dan sidik gambar pada ruangan. Jika balasan pertama hilang, server mengembalikan ruangan beserta status terkininya, termasuk setelah server dimulai ulang. Dua pengiriman bersamaan untuk rekaman yang sama juga menghasilkan satu ruangan. Klien lama tetap bisa mengirim rekaman tanpa ID.

Server memeriksa kepemilikan properti, jumlah gambar, format JPEG, dimensi, dan kesinambungan cakupan hingga kedua kutub. Worker membaca area yang bertumpuk untuk menyelaraskan gambar, menyesuaikan kecerahan, dan melembutkan batas sambungan. Worker menyimpan JPEG 2:1 dan pratinjau pada properti yang sama. Resolusi keluaran mengikuti lebar sumber, yaitu 3072 × 1536 pada web dan 2048 × 1024 pada mobile. Pengunjung membuka hasil melalui viewer dan hotspot Walk Inside yang sudah ada.

## Pustaka yang digunakan

- **Expo Camera** menyediakan akses ke kamera belakang dan pengambilan gambar di Android dan iOS. Mode panorama beserta pratinjaunya dijalankan oleh EstateVerse. [Dokumentasi Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- **Expo ImageManipulator** menangani orientasi, ukuran, dan penyimpanan JPEG di perangkat. [Dokumentasi Expo ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)
- **jpeg-js 0.4.4** mengubah JPEG sementara milik aplikasi menjadi piksel untuk pencocokan. Perekam membatasi ukuran berkas, resolusi, dan memori decoder. Versi 0.4.4 sudah memuat perbaikan untuk CVE-2022-25851. [Advisori GitHub](https://github.com/advisories/GHSA-xvf7-4v9q-58w6)
- Backend memakai decoder dan encoder JPEG dari pustaka standar Go serta penyatu gambar dalam `internal/panorama`. [Dokumentasi image/jpeg](https://pkg.go.dev/image/jpeg)

Saat fitur ini diuji, kueri OSV untuk versi di lockfile mobile (`expo-camera@58.0.14`, `expo-image-manipulator@58.0.16`, dan `jpeg-js@0.4.4`) tidak mengembalikan advisori. Basis data kerentanan resmi Go per 24 November 2026 juga tidak mencantumkan laporan untuk `image/jpeg`. Pemeriksaan ini terbatas pada pustaka yang dipakai untuk menangkap dan mengolah gambar. [Basis data OSV](https://osv.dev/) · [Basis data keamanan Go](https://go.dev/doc/security/vuln/database)

Toolchain Go 1.27.1 yang dipakai untuk pengujian memiliki advisori terpisah pada `net/http`, dengan perbaikan pada seri 1.27.4. Handler unggahan panorama selesai membaca formulir sebelum menulis respons. [GO-2026-6859](https://pkg.go.dev/vuln/GO-2026-6859)

## Verifikasi

Untuk menguji ulang unggahan yang kehilangan balasan, arahkan `ESTATEVERSE_TEST_MYSQL_DSN` ke MySQL lokal khusus pengujian, lalu jalankan `go test ./internal/repositories -run TestMySQLCaptureReceipt -count=1` dari `backend`. Tes membuat dan menghapus skema uji sendiri untuk memeriksa migrasi 019, pengiriman serentak, dan pemulihan setelah koneksi database dibuka ulang.

Jalankan `npm run test:capture` di `frontend`, `npm run test:api` di `mobile`, serta `go test ./...` di `backend`. Tes kamera sintetis mencakup lensa lebar dan sempit, gerak melewati arah 0°, gambar beku, dan bagian putaran yang terlewat. Salah satu tes membandingkan panorama yang direkam dengan geometri ruangan acuan yang memiliki kusen, lantai berubin, dan plafon polos. Tes backend memeriksa sambungan antargambar, validasi input, dan penyimpanan panorama serta pratinjau. Kualitas sambungan di ruang sempit, dekat cermin, atau pada kamera dengan stabilisasi agresif tetap perlu diperiksa pada HP fisik.

## Kompatibilitas rekaman lama

Server tetap mendukung manifest `frames` yang memuat foto perspektif berikut quaternion per foto. Klien lama memakai endpoint `/tours/calibration`. Rincian di bawah berlaku untuk pemrosesan rekaman lama tersebut.

Satu ruangan direkam dari **satu posisi lensa**, bukan dengan berjalan mengitari ruangan. Tidak ada pilihan jumlah foto. Kedua klien memulai dengan tiga foto yang bertumpuk pada heading 0°, 20°, dan 40°. Foto dikirim bersama quaternion ke backend untuk mengukur sudut pandang lensa melalui korelasi gambar; ketiganya dipakai kembali dalam panorama akhir.

Backend menyusun foto menjadi **satu jalur berurutan**: putaran setinggi mata yang melanjutkan tiga foto awal, lalu satu atau lebih putaran miring ke atas (opsional plafon), kemudian putaran miring ke bawah (opsional lantai). Setiap putaran berjalan searah jarum jam (putar ke kanan) dengan jarak yang sama, dan dimulai pada heading foto sebelumnya sehingga pindah putaran cukup dengan menengadah atau menunduk tanpa memutar badan. Jarak antarfoto dihitung dari bidang pandang lensa yang terukur dengan overlap samping 20–30% (15% hanya untuk lensa sempit yang akan melewati batas 48 foto). Server mencoba kombinasi ketinggian putaran pada kisi 5°, memproyeksikannya ke sampel bola berbobot luas permukaan, dan memilih jalur dengan foto paling sedikit yang mencapai cakupan 99,8% (margin sudut 2°) serta overlap minimal 18% antara setiap foto miring dan putaran di bawahnya.

Dalam tes proyeksi portrait 9:16, algoritma menghasilkan 26 foto pada sudut horizontal 48° (12 setinggi mata, 7 atas, 7 bawah) dan 20 pada 60°, termasuk tiga foto awal. Lensa 40° membutuhkan 36 foto. Jumlah bergantung pada bidang pandang dan rasio gambar. Bila gambar terlalu polos untuk mengukur lensa, backend memakai perkiraan konservatif sudut sisi pendek 34° yang dapat membutuhkan lebih banyak foto (47 pada 9:16). Batas upload tetap 48 foto. Angka ini hasil sintetis, bukan jaminan semua kamera HP.

**Mesin utama: Hugin.** Bila `hugin-tools` dan `enblend` terpasang (`apt install --no-install-recommends hugin-tools enblend`), backend memanggil Hugin sebagai proses terpisah (`internal/panorama/hugin*.go`). Langkahnya:

1. `pto_gen` dan `pto_var` menempatkan setiap foto sesuai orientasi sensor HP. Konvensi Hugin sama dengan `EulerToMat` kecuali tanda roll terbalik; ini diverifikasi dengan `pano_trafo` dan dikunci oleh `TestHuginRollConvention`.
2. `cpfind --prealigned --ransacmode=rpyv --ransacdist=10` mencocokkan fitur hanya pada pasangan yang bertumpuk. Model RANSAC rotasi-saja membuang salah cocok pada tekstur berulang (plafon bergelombang, ubin).
3. `cpclean` membuang outlier tersisa.
4. `autooptimiser` mengoptimasi y/p/r, FOV, dan distorsi `b`.
5. Seluruh rig diputar sekali agar rata-ratanya sesuai sensor, sehingga horizon dan arah mengikuti gravitasi dari semua foto, bukan hanya foto pertama.
6. `vig_optimize` menyamakan exposure dan white balance.
7. `nona` dan `enblend --wrap=horizontal` membuat equirectangular 360×180.

Pencocokan fitur Hugin tidak bergantung pada tebakan FOV awal; dalam tes sintetis, tebakan 35° untuk lensa 40° berhasil dikoreksi ke 40,1°. Satu ruangan 36 foto 720×1280 butuh sekitar 1–2 menit di server 2 core. Jika Hugin tidak terpasang, menemukan kurang dari 20 titik, atau solusinya ditolak (FOV di luar 20–120°, rms > 3°), backend otomatis memakai pipeline Go di bawah ini. Log `tour room stitched` mencatat `engine`.

**Cadangan: pipeline Go.** Server mengestimasi sudut lensa sesuai rasio lebar/tinggi foto dan memperbaiki orientasi secara kasar dengan korelasi thumbnail bagian foto yang bertumpuk. Setelah itu server mencari titik sudut (Shi-Tomasi) di setiap foto dan melacaknya ke foto tetangga dengan pencocokan template bertingkat yang dipandu orientasi (presisi sub-piksel). Semua titik cocok masuk ke satu *bundle adjustment* global (Levenberg-Marquardt, loss Cauchy) yang mengoptimasi rotasi semua foto, focal length, dan distorsi radial lensa `k1` sekaligus. Titik yang masih meleset lebih dari 5 px dibuang lalu solusinya dihitung ulang. Jika titik terlalu sedikit (dinding polos) atau korelasi justru turun, hasil korelasi dipertahankan. Estimasi lensa tidak bergeser hanya karena area polos tidak memberi informasi pencocokan.

Komposisi tidak lagi merata-ratakan semua foto yang bertumpuk karena itu menghasilkan gambar dobel. Pada grid seam equirectangular (maksimal 512 kolom), setiap pasangan foto yang bertumpuk dipotong dengan *graph cut* (max-flow) sehingga sambungan lewat di area yang warnanya sama di kedua foto, bukan memotong kusen pintu atau kabel. Setiap area akhirnya hanya milik satu foto. Blending dua-band memudarkan kecerahan (low band, skala ±1,5°) secara lebar dan detail (±0,3°) secara sempit, setelah exposure diseimbangkan. Log server mencatat `matches` dan `match_rms_px` untuk setiap ruangan sebagai indikator ketepatan alignment.

## Status dan penyimpanan ruangan

Saat capture baru diterima untuk properti yang sudah tayang, backend mengubah properti menjadi `draft` agar panorama setengah jadi tidak terlihat publik. Setelah seluruh room selesai dan berstatus `ready`, web menampilkan toast dan mobile menampilkan dialog bahwa panorama siap dipublish. Publish tetap dilakukan oleh penjual dari status properti.

Backend mencatat setiap request HTTP, login, antrean model, antrean stitching, pemulihan job, keberhasilan, dan kegagalan ke console terstruktur serta tabel `activity_logs` melalui migrasi 013. Seller dapat membaca riwayatnya melalui `GET /api/v1/dashboard/activity?limit=50&offset=0`; detail internal error tetap disimpan di server dan tidak dikirim ke client.

Mobile login menggunakan akun backend yang sama melalui `/api/v1/auth/mobile/login`, menyimpan bearer token di SecureStore, lalu membaca properti dan tur dari API Go. Akun/ID dari SQLite prototipe tidak dipakai untuk permintaan server dan data SQLite lama tidak dihapus. Login web tetap menggunakan cookie HttpOnly.
