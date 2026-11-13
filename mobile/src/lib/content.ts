import type { PropertyType } from '@/types/property';

// Property type options shown in the listing form and catalog.
export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'house', label: 'Rumah' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Apartemen' },
  { value: 'commercial', label: 'Komersial' },
  { value: 'land', label: 'Kavling' },
];

// Returns the Indonesian label of a property type.
export function getPropertyTypeLabel(type: PropertyType): string {
  return PROPERTY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Rumah';
}

// Ready-made benefits sellers can tick instead of typing everything.
export const BENEFIT_TEMPLATES: string[] = [
  'Dekat jalan tol (5 menit)',
  'Dekat mall & pusat perbelanjaan',
  'Dekat sekolah & kampus',
  'Dekat rumah sakit',
  'Dekat stasiun / halte transportasi',
  'Keamanan 24 jam & CCTV',
  'Lingkungan tenang & asri',
  'Bebas banjir',
  'Carport luas untuk 2 mobil',
  'Taman & area bermain anak',
  'Kolam renang pribadi',
  'Sertifikat SHM siap AJB',
];

export const HOW_IT_WORKS_STEPS: { title: string; description: string }[] = [
  {
    title: 'Pilih lokasi & kebutuhan',
    description: 'Tentukan kota, kisaran harga, dan jenis rumah yang cocok untuk keluarga Anda.',
  },
  {
    title: 'Lihat foto & rincian rumah',
    description: 'Geser galeri foto, cek ukuran rumah, jumlah kamar, dan keunggulan lokasinya.',
  },
  {
    title: 'Hubungi pemilik lewat WhatsApp',
    description: 'Tanya langsung atau buat janji survei lokasi tanpa perantara yang rumit.',
  },
  {
    title: 'Cek surat & terima kunci',
    description: 'Pastikan surat rumah lengkap (SHM/AJB), lalu lanjut ke serah terima kunci.',
  },
];

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Apakah saya bisa menghubungi pemilik rumah secara langsung?',
    answer:
      'Bisa. Di setiap halaman rumah ada tombol WhatsApp yang langsung terhubung ke pemilik atau agen resmi, tanpa biaya tambahan.',
  },
  {
    question: 'Bagaimana cara memasang iklan rumah?',
    answer:
      'Daftar sebagai penjual, buka menu Akun, lalu pilih Tambah Properti. Isi informasi rumah, pilih beberapa foto, dan tentukan keunggulan lokasinya.',
  },
  {
    question: 'Berapa foto yang bisa saya unggah?',
    answer:
      'Anda bisa memilih beberapa foto sekaligus dari galeri atau mengambil foto langsung dengan kamera. Foto pertama menjadi foto sampul iklan.',
  },
  {
    question: 'Apakah harga dan ukuran rumah sudah jelas?',
    answer:
      'Ya. Setiap iklan menampilkan harga dalam Rupiah, perkiraan harga per meter persegi, luas tanah, luas bangunan, serta jumlah kamar dan lantai.',
  },
];

export const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'Baru' },
  { value: 'contacted', label: 'Sudah Dihubungi' },
  { value: 'scheduled', label: 'Jadwal Survei' },
  { value: 'closed', label: 'Deal Selesai' },
] as const;
