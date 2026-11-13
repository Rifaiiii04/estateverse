export interface AiAnswer {
  text: string;
  linkSlug?: string;
  linkTitle?: string;
}

export const AI_WELCOME_MESSAGE =
  'Halo! Saya Asisten Pintar EstateVerse. Silakan tanyakan perkiraan harga rumah, potensi sewa, cicilan KPR, atau rekomendasi rumah untuk Anda.';

export const AI_SUGGESTIONS: string[] = [
  'Hitung perkiraan hasil sewa villa di Bali',
  'Hitung cicilan KPR untuk rumah Rp 3,4 Miliar',
  'Rekomendasi rumah keluarga nyaman di Sentul',
];

// Checks whether the query contains at least one of the given keywords.
function hasKeyword(query: string, keywords: string[]): boolean {
  return keywords.some((keyword) => query.includes(keyword));
}

// Returns a friendly, easy-to-understand answer based on keywords in the user's question.
export function generateAiAnswer(query: string): AiAnswer {
  const q = query.toLowerCase();

  if (hasKeyword(q, ['bali', 'villa', 'sewa', 'roi', 'yield', 'income'])) {
    return {
      text: 'Untuk villa di Bali (kawasan Uluwatu & Seminyak), potensi hasil sewa rata-rata 10% hingga 14% per tahun karena ramainya wisatawan. Island Retreat Modern Villa adalah salah satu pilihan terbaik.',
      linkSlug: 'island-retreat-modern-villa',
      linkTitle: 'Lihat Island Retreat Modern Villa',
    };
  }

  if (hasKeyword(q, ['kpr', 'cicilan', 'biaya', 'dp', 'mortgage', 'payment'])) {
    return {
      text: 'Untuk rumah seharga Rp 3,4 Miliar dengan uang muka (DP) 10% (Rp 340 Juta) dan bunga KPR 5,5% selama 20 tahun, perkiraan cicilan sekitar Rp 23,5 Juta per bulan. Siapkan juga sekitar 6% untuk pajak pembeli dan pengurusan surat di notaris.',
    };
  }

  if (hasKeyword(q, ['360', 'street view', 'virtual tour', 'tur', 'keliling', 'walk', 'foto', 'kamar'])) {
    return {
      text: 'EstateVerse kini dilengkapi fitur Tur Street View 360°! Anda bisa menggeser layar untuk melihat sekeliling ruangan 360 derajat dan berpindah antar kamar secara interaktif. Coba jelajahi sekarang di Tulum Eco Modern Retreat!',
      linkSlug: 'tulum-eco-modern-retreat',
      linkTitle: 'Buka Tur 360° Tulum Eco Retreat',
    };
  }

  return {
    text: 'Saya menyarankan Anda melihat Serenity Tower Residence di Sentul. Rumah ini punya tata ruang modern yang terang, lingkungan sejuk, dan akses mudah ke jalan tol.',
    linkSlug: 'serenity-tower-residence',
    linkTitle: 'Lihat Serenity Tower Residence',
  };
}
