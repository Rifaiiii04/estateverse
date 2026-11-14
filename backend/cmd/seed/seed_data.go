package main

// demoSeller is a clearly labelled demo account that owns sample listings.
type demoSeller struct {
	key   string
	name  string
	email string
}

// demoListing is a sample home sized for first-time buyers in Central Java.
type demoListing struct {
	seller      string
	title       string
	slug        string
	description string
	pType       string
	price       int64
	address     string
	city        string
	province    string
	landArea    int
	buildArea   int
	beds        int
	baths       int
	floors      int
	benefits    []string
}

// demoLead is a sample buyer inquiry; names are marked as demo data.
type demoLead struct {
	slug       string
	name       string
	budget     string
	note       string
	viewedTour bool
	status     string
}

// legacyDemoSlugs are the luxury sample villas created by the previous seeder.
var legacyDemoSlugs = []string{
	"serenity-tower-residence", "island-retreat-modern-villa", "mountain-lodge-villa",
	"comporta-beach-lux", "tulum-eco-retreat", "azura-coastal-villa",
}

var demoSellers = []demoSeller{
	{key: "sri", name: "Sri Wahyuni (Akun Demo)", email: "penjual.sri@demo.estateverse.id"},
	{key: "agus", name: "Agus Setiawan (Akun Demo)", email: "penjual.agus@demo.estateverse.id"},
	{key: "griya", name: "CV Griya Banyumas (Akun Demo)", email: "developer.griya@demo.estateverse.id"},
}

var demoListings = []demoListing{
	{seller: "sri", title: "Rumah 2 Kamar Dekat Kampus Grendeng", slug: "rumah-2-kamar-dekat-kampus-grendeng",
		description: "Rumah tapak satu lantai di Grendeng, Purwokerto Utara. Dibangun 2016, atap baru diganti 2024. Air PDAM dan listrik 1.300 VA. Jalan depan muat satu mobil. Cocok untuk keluarga muda atau rumah pertama.",
		pType: "house", price: 385_000_000, address: "Jl. Kampus Grendeng (alamat lengkap saat survei)", city: "Purwokerto", province: "Jawa Tengah",
		landArea: 90, buildArea: 54, beds: 2, baths: 1, floors: 1, benefits: []string{"Dekat sekolah & kampus", "Dekat pasar & minimarket", "Sertifikat SHM siap AJB"}},
	{seller: "sri", title: "Rumah Keluarga 3 Kamar Purwokerto Selatan", slug: "rumah-keluarga-3-kamar-purwokerto-selatan",
		description: "Rumah keluarga di lingkungan perumahan lama yang tenang. Ruang tamu dan ruang keluarga terpisah, dapur belakang, carport satu mobil. Lokasi 10 menit ke pusat kota.",
		pType: "house", price: 620_000_000, address: "Kel. Karangpucung (alamat lengkap saat survei)", city: "Purwokerto", province: "Jawa Tengah",
		landArea: 120, buildArea: 86, beds: 3, baths: 2, floors: 1, benefits: []string{"Lingkungan aman & tenang", "Akses jalan muat mobil", "Bebas banjir"}},
	{seller: "agus", title: "Rumah Mungil Siap Huni Banyumas", slug: "rumah-mungil-siap-huni-banyumas",
		description: "Rumah tipe 36 siap huni, lantai keramik, plafon gypsum. Cocok untuk pasangan muda. Bisa KPR melalui bank pilihan pembeli.",
		pType: "house", price: 215_000_000, address: "Kec. Banyumas (alamat lengkap saat survei)", city: "Banyumas", province: "Jawa Tengah",
		landArea: 72, buildArea: 36, beds: 2, baths: 1, floors: 1, benefits: []string{"Dekat puskesmas / rumah sakit", "Bebas banjir"}},
	{seller: "agus", title: "Rumah Pinggir Kota Purbalingga", slug: "rumah-pinggir-kota-purbalingga",
		description: "Rumah dengan halaman belakang luas, cocok untuk berkebun. Air sumur dan PDAM. Lingkungan desa yang dekat ke pusat kota Purbalingga.",
		pType: "house", price: 295_000_000, address: "Kec. Kalimanah (alamat lengkap saat survei)", city: "Purbalingga", province: "Jawa Tengah",
		landArea: 150, buildArea: 60, beds: 2, baths: 1, floors: 1, benefits: []string{"Lingkungan aman & tenang", "Dekat sekolah & kampus"}},
	{seller: "griya", title: "Cluster Griya Banyumas Tipe 45", slug: "cluster-griya-banyumas-tipe-45",
		description: "Unit cluster kecil 24 rumah dari developer lokal. Tipe 45 dengan 2 kamar tidur, satu gerbang, jalan lingkungan cor. Tersedia unit siap huni.",
		pType: "cluster", price: 345_000_000, address: "Kec. Sokaraja (alamat lengkap saat survei)", city: "Banyumas", province: "Jawa Tengah",
		landArea: 84, buildArea: 45, beds: 2, baths: 1, floors: 1, benefits: []string{"Lingkungan aman & tenang", "Akses jalan muat mobil", "Sertifikat SHM siap AJB"}},
	{seller: "griya", title: "Townhouse 2 Lantai Dekat Stasiun Cilacap", slug: "townhouse-2-lantai-dekat-stasiun-cilacap",
		description: "Townhouse dua lantai dengan 3 kamar tidur. 7 menit ke Stasiun Cilacap. Cocok untuk pekerja kawasan industri.",
		pType: "townhouse", price: 525_000_000, address: "Kec. Cilacap Tengah (alamat lengkap saat survei)", city: "Cilacap", province: "Jawa Tengah",
		landArea: 70, buildArea: 96, beds: 3, baths: 2, floors: 2, benefits: []string{"Dekat stasiun / terminal", "Dekat pasar & minimarket"}},
	{seller: "agus", title: "Rumah Hook Dekat Alun-alun Tegal", slug: "rumah-hook-dekat-alun-alun-tegal",
		description: "Rumah posisi hook dengan dua sisi jalan, cocok untuk usaha kecil di depan rumah. 10 menit ke Alun-alun Tegal.",
		pType: "house", price: 790_000_000, address: "Kec. Tegal Timur (alamat lengkap saat survei)", city: "Tegal", province: "Jawa Tengah",
		landArea: 160, buildArea: 110, beds: 3, baths: 2, floors: 1, benefits: []string{"Akses jalan muat mobil", "Dekat pasar & minimarket"}},
	{seller: "sri", title: "Rumah Minimalis Banyumanik Semarang", slug: "rumah-minimalis-banyumanik-semarang",
		description: "Rumah minimalis di daerah atas Semarang yang sejuk. Dekat kampus dan akses tol. Kondisi terawat, siap huni.",
		pType: "house", price: 950_000_000, address: "Kec. Banyumanik (alamat lengkap saat survei)", city: "Semarang", province: "Jawa Tengah",
		landArea: 112, buildArea: 90, beds: 3, baths: 2, floors: 1, benefits: []string{"Dekat sekolah & kampus", "Bebas banjir"}},
}

var demoLeads = []demoLead{
	{slug: "rumah-2-kamar-dekat-kampus-grendeng", name: "Dimas (Demo)", budget: "Rp 400 juta",
		note: "Sudah lihat tur 360°, ruang tamunya cocok. Bisa survei Sabtu pagi?", viewedTour: true, status: "scheduled"},
	{slug: "rumah-2-kamar-dekat-kampus-grendeng", name: "Rina (Demo)", budget: "Rp 350 juta",
		note: "Apakah harga masih bisa nego? Rencana pakai KPR.", viewedTour: false, status: "new"},
	{slug: "cluster-griya-banyumas-tipe-45", name: "Yoga (Demo)", budget: "Rp 350 juta",
		note: "Ingin tahu unit yang siap huni. Sudah lihat tur kamar utama.", viewedTour: true, status: "contacted"},
}
