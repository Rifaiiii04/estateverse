# Walk Inside 360°: capture dan stitching

## Metode

Satu ruangan direkam dari **satu posisi lensa**, bukan dengan berjalan mengitari ruangan. Tidak ada pilihan jumlah foto. Kedua klien memulai dengan tiga foto yang bertumpuk pada heading 0°, 20°, dan 40°. Foto dikirim bersama quaternion ke backend untuk mengukur sudut pandang lensa melalui korelasi gambar; ketiganya dipakai kembali dalam panorama akhir.

Backend memproyeksikan bidang pandang kamera ke sampel bola berbobot luas permukaan, memilih arah yang menambah cakupan paling besar dengan overlap minimal 18%, lalu memangkas foto tambahan yang redundan. Target perencanaan cakupan adalah 99,8% dengan margin sudut 2°. Arah tersisa diurutkan menjadi sapuan yang mudah diikuti. Ini optimasi heuristik, bukan bukti jumlah foto paling sedikit secara matematis.

Dalam tes proyeksi portrait 9:16, algoritma menghasilkan 24 foto pada sudut horizontal 48° dan 17 pada 60°, termasuk tiga foto awal. Lensa 40° membutuhkan 32 foto. Jumlah bergantung pada bidang pandang dan rasio gambar. Bila gambar terlalu polos untuk mengukur lensa, backend memakai perkiraan konservatif sudut sisi pendek 34° yang dapat membutuhkan lebih banyak foto (47 pada 9:16). Batas upload tetap 48 foto. Angka ini hasil sintetis, bukan jaminan semua kamera HP.

Chrome Android harus dibuka melalui HTTPS. Gunakan kamera belakang, pegang HP portrait, dan matikan putar otomatis layar. Arah pertama menjadi acuan heading sesi; tidak perlu menghadap utara. Sistem menunggu HP diam selama 650 ms dengan kecepatan rotasi maksimal 4°/detik, termasuk gerakan roll. Snapshot menunggu frame video baru dan mengambil orientasi tepat sebelum menyalin piksel. Sampel sensor yang kedaluwarsa atau pergerakan saat snapshot menyebabkan foto diulang pada titik yang sama.

Server mengestimasi sudut lensa sesuai rasio lebar/tinggi foto, memperbaiki orientasi berdasarkan korelasi bagian foto yang bertumpuk, menyeimbangkan exposure, lalu memproyeksikan foto ke panorama equirectangular 2:1. Estimasi lensa tidak bergeser hanya karena area polos tidak memberi informasi pencocokan.

## Cara merekam

1. Nyalakan lampu, hindari orang atau benda bergerak, dan bersihkan lensa.
2. Berdiri di lokasi yang dapat melihat seluruh ruangan; jangan terlalu dekat dinding atau furnitur.
3. Pertahankan lokasi lensa saat menoleh dan menunduk. Bergeraklah mengelilingi titik lensa, jangan mengayunkan lensa mengelilingi badan. Kepala tripod panorama membantu menjaga poros ini.
4. Ikuti panah, tempatkan titik berikutnya di lingkaran tengah, lalu tunggu sampai penghitung foto bertambah sebelum bergerak lagi.
5. Setelah tiga foto awal, tunggu perhitungan server dan selesaikan semua titik tambahan. Penghitung berubah sesuai rencana hasil pengukuran. Gunakan satu rekaman terpisah untuk setiap ruangan, lalu hubungkan dengan hotspot.
6. Periksa hasil pada tepi pintu, sudut tembok, plafon, dan pertemuan awal/akhir putaran sebelum mempublikasikan listing.

## Pemeriksaan hasil dan keterbatasan

- Cakupan piksel asli minimal 98,5%; interpolasi tidak dihitung sebagai bukti sudut sudah terfoto.
- Skor korelasi keseluruhan minimal 0,45; foto yang tidak cocok tidak boleh menjadi ruangan berstatus `ready`.
- Pesan gagal memberi arahan merekam ulang. Frame rekaman gagal tetap privat untuk diagnosis dan terhapus saat ruangannya dihapus.
- Skor kualitas adalah indikator teknis, bukan persentase akurasi visual. Ambang perlu dievaluasi lagi dengan rekaman nyata dari berbagai HP.
- Model proyeksi mengasumsikan lensa berputar pada satu titik. Parallax akibat perpindahan lensa, objek bergerak, pantulan kaca, permukaan sangat polos, dan distorsi lensa tetap dapat menimbulkan artefak; rotasi sensor tidak dapat memperbaiki semuanya.
- Untuk hasil paling konsisten, gunakan foto equirectangular dari kamera 360° dan fitur **Unggah Foto 360**. Foto panorama horizontal biasa bukan foto satu bola 360° penuh.

## Verifikasi pengembang

`go test ./...` di `backend` menguji kalibrasi lensa portrait/landscape, pencocokan sintetis, penolakan foto berulang/tidak terkait, serta worker tur. `npm run test:capture` di `frontend` menguji grid, urutan, roll, dan pasangan frame/orientasi. Tes sintetis dan simulasi browser tidak menggantikan uji kamera/sensor pada HP sungguhan.

## Mobile dan website memakai satu backend

`shared/capturePolicy.ts` mendefinisikan tiga titik kalibrasi, validasi rencana server, toleransi sudut, waktu diam, dan format manifest untuk kedua klien. `shared/captureMath.ts` mengonversi orientasi ke quaternion `(w,x,y,z)` yang sama. Browser memberi sudut dalam derajat; Expo memberi radian dan diadaptasi sebelum upload. Mobile menunggu aplikasi kembali aktif setelah dialog izin sebelum memulai sensor; hanya transisi ke background saat benar-benar merekam yang membatalkan sesi.

`POST /api/v1/tours/calibration` menerima manifest `meta` dan tiga JPEG tanpa `property_id`, agar properti baru juga dapat direkam. Endpoint memerlukan autentikasi, dibatasi ukuran dan laju request, serta tidak menyimpan foto kalibrasi. Respons berisi pengukuran lensa, indikator kepercayaan, dan rencana arah 8–48 foto. Koneksi server diperlukan pada tahap ini.

Kedua klien mengirim `POST /api/v1/tours/captures` berupa `property_id`, manifest `meta`, dan JPEG `frame_0` hingga `frame_n`. Go memvalidasi sesi, kepemilikan, JPEG, resolusi, dan quaternion, menyimpan frame privat, lalu memasukkan room berstatus `processing` ke `TourQueue`. Worker background menjalankan `panorama.Stitch`, menyimpan panorama utama dan preview, lalu mengubah status menjadi `ready` atau `failed`. Room yang masih `processing` dipulihkan otomatis setelah backend restart; antrean tidak membuang job ketika sedang penuh. Kalibrasi lensa, alignment, exposure, blending, panorama utama, dan preview seluruhnya dibuat di backend. Klien hanya menangkap, mengunggah, membaca status, dan menampilkan hasil.

Saat capture baru diterima untuk properti yang sudah tayang, backend mengubah properti menjadi `draft` agar panorama setengah jadi tidak terlihat publik. Setelah seluruh room selesai dan berstatus `ready`, web menampilkan toast dan mobile menampilkan dialog bahwa panorama siap dipublish. Publish tetap dilakukan oleh penjual dari status properti.

Backend mencatat setiap request HTTP, login, antrean model, antrean stitching, pemulihan job, keberhasilan, dan kegagalan ke console terstruktur serta tabel `activity_logs` melalui migrasi 013. Seller dapat membaca riwayatnya melalui `GET /api/v1/dashboard/activity?limit=50&offset=0`; detail internal error tetap disimpan di server dan tidak dikirim ke client.

Mobile login menggunakan akun backend yang sama melalui `/api/v1/auth/mobile/login`, menyimpan bearer token di SecureStore, lalu membaca properti dan tur dari API Go. Akun/ID dari SQLite prototipe tidak dipakai untuk permintaan server dan data SQLite lama tidak dihapus. Login web tetap menggunakan cookie HttpOnly.

Tes kontrak memverifikasi request cookie web dan bearer mobile meneruskan JPEG serta orientasi identik ke layanan yang sama. Tes 400 kombinasi sudut membandingkan adapter native dengan konversi browser. Untuk **input JPEG dan orientasi yang sama**, pipeline pengolahannya sama; foto yang diambil terpisah tetap dipengaruhi lensa, exposure, gerakan, dan perangkat. Kesetaraan byte hasil akhir antar-rekaman terpisah tidak dijanjikan.
