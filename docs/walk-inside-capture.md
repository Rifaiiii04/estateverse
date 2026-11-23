# Walk Inside 360°: capture dan stitching

## Metode

Satu ruangan direkam dari **satu posisi lensa**, bukan dengan berjalan mengitari ruangan. Tidak ada pilihan jumlah foto. Kedua klien memulai dengan tiga foto yang bertumpuk pada heading 0°, 20°, dan 40°. Foto dikirim bersama quaternion ke backend untuk mengukur sudut pandang lensa melalui korelasi gambar; ketiganya dipakai kembali dalam panorama akhir.

Backend menyusun foto menjadi **satu jalur berurutan**: putaran setinggi mata yang melanjutkan tiga foto awal, lalu satu atau lebih putaran miring ke atas (opsional plafon), kemudian putaran miring ke bawah (opsional lantai). Setiap putaran berjalan searah jarum jam (putar ke kanan) dengan jarak yang sama, dan dimulai pada heading foto sebelumnya sehingga pindah putaran cukup dengan menengadah atau menunduk tanpa memutar badan. Jarak antarfoto dihitung dari bidang pandang lensa yang terukur dengan overlap samping 20–30% (15% hanya untuk lensa sempit yang akan melewati batas 48 foto). Server mencoba kombinasi ketinggian putaran pada kisi 5°, memproyeksikannya ke sampel bola berbobot luas permukaan, dan memilih jalur dengan foto paling sedikit yang mencapai cakupan 99,8% (margin sudut 2°) serta overlap minimal 18% antara setiap foto miring dan putaran di bawahnya.

Dalam tes proyeksi portrait 9:16, algoritma menghasilkan 26 foto pada sudut horizontal 48° (12 setinggi mata, 7 atas, 7 bawah) dan 20 pada 60°, termasuk tiga foto awal. Lensa 40° membutuhkan 36 foto. Jumlah bergantung pada bidang pandang dan rasio gambar. Bila gambar terlalu polos untuk mengukur lensa, backend memakai perkiraan konservatif sudut sisi pendek 34° yang dapat membutuhkan lebih banyak foto (47 pada 9:16). Batas upload tetap 48 foto. Angka ini hasil sintetis, bukan jaminan semua kamera HP.

Chrome Android harus dibuka melalui HTTPS. Gunakan kamera belakang, pegang HP portrait, dan matikan putar otomatis layar. Arah pertama menjadi acuan heading sesi; tidak perlu menghadap utara. Sistem menunggu HP diam selama total 500 ms dengan kecepatan rotasi rata-rata (jendela 200 ms) maksimal 6°/detik, termasuk gerakan roll. Goyangan singkat hanya mengurangi isi lingkaran, tidak mengulang dari nol, dan setelah mulai menahan ada kelonggaran bidik +2°. Snapshot menunggu frame video baru dan mengambil orientasi tepat sebelum menyalin piksel. Sampel sensor yang kedaluwarsa atau pergerakan saat snapshot menyebabkan foto diulang pada titik yang sama.

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

## Cara merekam

1. Nyalakan lampu, hindari orang atau benda bergerak, dan bersihkan lensa.
2. Berdiri di lokasi yang dapat melihat seluruh ruangan; jangan terlalu dekat dinding atau furnitur.
3. Pertahankan lokasi lensa saat menoleh dan menunduk. Bergeraklah mengelilingi titik lensa, jangan mengayunkan lensa mengelilingi badan. Kepala tripod panorama membantu menjaga poros ini.
4. Ikuti satu titik putih (garis putus-putus menunjukkan arah titik sesudahnya). Putar ke kanan, tempatkan titik di lingkaran tengah, lalu tunggu sampai penghitung foto bertambah sebelum bergerak lagi. Saat satu putaran selesai, panduan meminta menengadah atau menunduk untuk putaran berikutnya.
5. Setelah tiga foto awal, tunggu perhitungan server dan selesaikan semua titik tambahan. Penghitung berubah sesuai rencana hasil pengukuran. Gunakan satu rekaman terpisah untuk setiap ruangan, lalu hubungkan dengan hotspot.
6. Periksa hasil pada tepi pintu, sudut tembok, plafon, dan pertemuan awal/akhir putaran sebelum mempublikasikan listing.

## Pemeriksaan hasil dan keterbatasan

- Cakupan piksel asli minimal 98,5%; interpolasi tidak dihitung sebagai bukti sudut sudah terfoto.
- Skor korelasi keseluruhan minimal 0,45; foto yang tidak cocok tidak boleh menjadi ruangan berstatus `ready`.
- Pesan gagal memberi arahan merekam ulang. Frame rekaman gagal tetap privat untuk diagnosis dan terhapus saat ruangannya dihapus.
- Skor kualitas adalah indikator teknis, bukan persentase akurasi visual. Ambang perlu dievaluasi lagi dengan rekaman nyata dari berbagai HP.
- Model proyeksi mengasumsikan lensa berputar pada satu titik. Parallax akibat perpindahan lensa tidak bisa dihilangkan oleh model rotasi mana pun: lensa bergeser 10 cm saat merekam dinding berjarak 1 m menghasilkan selisih ±5,7°. Graph cut menyembunyikan selisih ini sebisanya dengan memindahkan sambungan ke area polos, tetapi ruangan sempit tetap paling rawan. Objek bergerak, pantulan kaca, dan permukaan sangat polos juga dapat menimbulkan artefak.
- Untuk hasil paling konsisten, gunakan foto equirectangular dari kamera 360° dan fitur **Unggah Foto 360**. Foto panorama horizontal biasa bukan foto satu bola 360° penuh.

## Verifikasi pengembang

`go test ./...` di `backend` menguji kalibrasi lensa portrait/landscape, pencocokan sintetis, penolakan foto berulang/tidak terkait, serta worker tur. Tes ruangan sintetis bertekstur memeriksa bahwa bundle adjustment menurunkan error rotasi relatif dari sekitar 0,5° ke sekitar 0,03°, mengukur distorsi `k1` dalam ±0,012, dan bahwa objek yang hanya ada di satu foto tidak meninggalkan ghost. Pada scene yang sama PSNR naik dari sekitar 17 dB (pipeline lama) ke sekitar 38 dB. `npm run test:capture` di `frontend` menguji grid, urutan, roll, dan pasangan frame/orientasi. Tes sintetis dan simulasi browser tidak menggantikan uji kamera/sensor pada HP sungguhan.

## Mobile dan website memakai satu backend

`shared/capturePolicy.ts` mendefinisikan tiga titik kalibrasi, validasi rencana server, toleransi sudut, waktu diam, dan format manifest untuk kedua klien. `shared/captureMath.ts` mengonversi orientasi ke quaternion `(w,x,y,z)` yang sama. Browser memberi sudut dalam derajat; Expo memberi radian dan diadaptasi sebelum upload. Mobile menunggu aplikasi kembali aktif setelah dialog izin sebelum memulai sensor; hanya transisi ke background saat benar-benar merekam yang membatalkan sesi.

`POST /api/v1/tours/calibration` menerima manifest `meta` dan tiga JPEG tanpa `property_id`, agar properti baru juga dapat direkam. Endpoint memerlukan autentikasi, dibatasi ukuran dan laju request, serta tidak menyimpan foto kalibrasi. Respons berisi pengukuran lensa, indikator kepercayaan, dan rencana arah 8–48 foto. Koneksi server diperlukan pada tahap ini.

Kedua klien mengirim `POST /api/v1/tours/captures` berupa `property_id`, manifest `meta`, dan JPEG `frame_0` hingga `frame_n`. Go memvalidasi sesi, kepemilikan, JPEG, resolusi, dan quaternion, menyimpan frame privat, lalu memasukkan room berstatus `processing` ke `TourQueue`. Worker background menjalankan `panorama.Stitch`, menyimpan panorama utama dan preview, lalu mengubah status menjadi `ready` atau `failed`. Room yang masih `processing` dipulihkan otomatis setelah backend restart; antrean tidak membuang job ketika sedang penuh. Kalibrasi lensa, alignment, exposure, blending, panorama utama, dan preview seluruhnya dibuat di backend. Klien hanya menangkap, mengunggah, membaca status, dan menampilkan hasil.

Saat capture baru diterima untuk properti yang sudah tayang, backend mengubah properti menjadi `draft` agar panorama setengah jadi tidak terlihat publik. Setelah seluruh room selesai dan berstatus `ready`, web menampilkan toast dan mobile menampilkan dialog bahwa panorama siap dipublish. Publish tetap dilakukan oleh penjual dari status properti.

Backend mencatat setiap request HTTP, login, antrean model, antrean stitching, pemulihan job, keberhasilan, dan kegagalan ke console terstruktur serta tabel `activity_logs` melalui migrasi 013. Seller dapat membaca riwayatnya melalui `GET /api/v1/dashboard/activity?limit=50&offset=0`; detail internal error tetap disimpan di server dan tidak dikirim ke client.

Mobile login menggunakan akun backend yang sama melalui `/api/v1/auth/mobile/login`, menyimpan bearer token di SecureStore, lalu membaca properti dan tur dari API Go. Akun/ID dari SQLite prototipe tidak dipakai untuk permintaan server dan data SQLite lama tidak dihapus. Login web tetap menggunakan cookie HttpOnly.

Tes kontrak memverifikasi request cookie web dan bearer mobile meneruskan JPEG serta orientasi identik ke layanan yang sama. Tes 400 kombinasi sudut membandingkan adapter native dengan konversi browser. Untuk **input JPEG dan orientasi yang sama**, pipeline pengolahannya sama; foto yang diambil terpisah tetap dipengaruhi lensa, exposure, gerakan, dan perangkat. Kesetaraan byte hasil akhir antar-rekaman terpisah tidak dijanjikan.
