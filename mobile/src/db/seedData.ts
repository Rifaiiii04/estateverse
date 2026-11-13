import type { PropertyInput } from '@/types/property';

const PHOTO_BASE = 'https://images.unsplash.com';
const PHOTO_QUERY = '?auto=format&fit=crop&w=1200&q=80';

// Builds a full Unsplash image URL from a photo id.
function photo(id: string): string {
  return `${PHOTO_BASE}/${id}${PHOTO_QUERY}`;
}

// Sample listings shown on first launch so the catalog is never empty.
export const SAMPLE_LISTINGS: PropertyInput[] = [
  {
    title: 'Island Retreat Modern Villa',
    description:
      'Villa modern dengan kolam renang pribadi dan teras luas menghadap laut. Cocok untuk hunian pribadi maupun disewakan kepada wisatawan.',
    propertyType: 'villa',
    price: 2_200_000_000,
    address: 'Jl. Pantai Bingin No. 88',
    city: 'Uluwatu',
    province: 'Bali',
    landArea: 280,
    buildingArea: 250,
    bedrooms: 4,
    bathrooms: 4,
    floors: 2,
    whatsappNumber: '081234567801',
    status: 'published',
    imagePaths: [photo('photo-1613490493576-7fde63acd811'), photo('photo-1600585154340-be6161a56a0c')],
    benefits: ['Kolam renang pribadi', 'Dekat pantai (5 menit)', 'Sertifikat SHM siap AJB'],
  },
  {
    title: 'Serenity Tower Residence',
    description:
      'Rumah dua lantai dengan jendela kaca besar, pencahayaan alami melimpah, dan lingkungan sejuk di kawasan Sentul.',
    propertyType: 'house',
    price: 3_400_000_000,
    address: 'Jl. Bukit Indah Raya No. 12',
    city: 'Sentul',
    province: 'Jawa Barat',
    landArea: 320,
    buildingArea: 250,
    bedrooms: 6,
    bathrooms: 2,
    floors: 2,
    whatsappNumber: '081234567802',
    status: 'published',
    imagePaths: [photo('photo-1600607687939-ce8a6c25118c'), photo('photo-1600596542815-ffad4c1539a9')],
    benefits: ['Dekat jalan tol (5 menit)', 'Keamanan 24 jam & CCTV', 'Lingkungan tenang & asri'],
  },
  {
    title: 'Tulum Eco Modern Retreat',
    description:
      'Rumah bergaya modern tropis dengan material ramah lingkungan, taman hijau, dan sirkulasi udara yang baik.',
    propertyType: 'house',
    price: 4_500_000_000,
    address: 'Jl. Raya Puncak No. 45',
    city: 'Cisarua',
    province: 'Jawa Barat',
    landArea: 400,
    buildingArea: 150,
    bedrooms: 3,
    bathrooms: 1,
    floors: 1,
    whatsappNumber: '081234567803',
    status: 'published',
    imagePaths: [photo('photo-1512917774080-9991f1c4c750')],
    benefits: ['Udara sejuk pegunungan', 'Taman & area bermain anak', 'Bebas banjir'],
  },
  {
    title: 'Comporta Beach Luxury Villa',
    description:
      'Villa mewah dengan desain terbuka, dekat pusat kuliner dan pantai. Siap huni dengan perabot lengkap.',
    propertyType: 'villa',
    price: 3_000_000_000,
    address: 'Jl. Kayu Aya No. 21',
    city: 'Seminyak',
    province: 'Bali',
    landArea: 320,
    buildingArea: 230,
    bedrooms: 6,
    bathrooms: 3,
    floors: 1,
    whatsappNumber: '081234567804',
    status: 'published',
    imagePaths: [photo('photo-1564013799919-ab600027ffc6')],
    benefits: ['Dekat pantai (5 menit)', 'Kolam renang pribadi', 'Dekat mall & pusat perbelanjaan'],
  },
  {
    title: 'Mountain Lodge Villa',
    description:
      'Rumah dengan ruang tamu luas dan dinding kayu hangat, berada di kawasan Dago yang tenang dengan pemandangan kota.',
    propertyType: 'house',
    price: 5_000_000_000,
    address: 'Jl. Dago Giri No. 7',
    city: 'Dago',
    province: 'Jawa Barat',
    landArea: 460,
    buildingArea: 400,
    bedrooms: 6,
    bathrooms: 3,
    floors: 2,
    whatsappNumber: '081234567805',
    status: 'published',
    imagePaths: [photo('photo-1600047509807-ba8f99d2cdde')],
    benefits: ['Dekat sekolah & kampus', 'Carport luas untuk 2 mobil', 'Lingkungan tenang & asri'],
  },
  {
    title: 'Modern Minimalist Villa Grand',
    description:
      'Villa minimalis dengan taman belakang dan halaman depan yang lapang, cocok untuk keluarga besar.',
    propertyType: 'villa',
    price: 2_600_000_000,
    address: 'Jl. Setiabudi No. 33',
    city: 'Bandung',
    province: 'Jawa Barat',
    landArea: 220,
    buildingArea: 180,
    bedrooms: 4,
    bathrooms: 3,
    floors: 2,
    whatsappNumber: '081234567806',
    status: 'published',
    imagePaths: [photo('photo-1600566753190-17f0baa2a6c3')],
    benefits: ['Dekat mall & pusat perbelanjaan', 'Keamanan 24 jam & CCTV'],
  },
];
