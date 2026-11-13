export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  recommendationLink?: string;
  recommendationTitle?: string;
}

// generateAiAnswer returns friendly, easy-to-understand real-estate advice based on user questions and active locale.
export function generateAiAnswer(
  query: string,
  isEn: boolean
): { text: string; link?: string; title?: string } {
  const q = query.toLowerCase();

  if (q.includes("bali") || q.includes("villa") || q.includes("roi") || q.includes("yield") || q.includes("sewa") || q.includes("income")) {
    return {
      text: isEn
        ? "For Bali villas (Uluwatu & Seminyak), yearly rental returns average 10% to 14% with high holiday bookings. Island Retreat Villa is a great choice and comes with a full 3D home tour."
        : "Untuk villa di Bali (kawasan Uluwatu & Seminyak), potensi hasil sewa rata-rata 10% hingga 14% per tahun karena ramainya wisatawan. Island Retreat Modern Villa adalah salah satu pilihan terbaik yang sudah dilengkapi tampilan 3D.",
      link: "/properties/island-retreat-modern-villa",
      title: isEn ? "View Island Retreat in 3D" : "Lihat Island Retreat 3D",
    };
  }

  if (q.includes("dollhouse") || q.includes("atap") || q.includes("roof") || q.includes("3d") || q.includes("walk") || q.includes("ruangan")) {
    return {
      text: isEn
        ? "In EstateVerse, you can open the roof view to see the entire room layout from above, or choose 'Walk Inside' to look around each room right from your screen before visiting in person."
        : "Di EstateVerse, Anda bisa membuka tampilan atap rumah untuk melihat seluruh susunan kamar dari atas dengan jelas, atau memilih menu 'Masuk ke Dalam' untuk melihat isi ruangan sebelum datang langsung ke lokasi.",
      link: "/properties",
      title: isEn ? "Browse 3D Homes" : "Lihat Daftar Rumah 3D",
    };
  }

  if (q.includes("kpr") || q.includes("mortgage") || q.includes("cicilan") || q.includes("biaya") || q.includes("dp") || q.includes("payment")) {
    return {
      text: isEn
        ? "For a home priced at Rp 3.4 Billion with a 10% down payment (Rp 340M) and 5.5% interest for 20 years, the estimated monthly payment is around Rp 23.5 Million. It is also good to prepare around 6% for buyer taxes and notary papers."
        : "Untuk rumah seharga Rp 3,4 Miliar dengan uang muka (DP) 10% (Rp 340 Juta) dan bunga KPR 5,5% selama 20 tahun, perkiraan cicilan per bulan sekitar Rp 23,5 Juta. Siapkan juga sekitar 6% untuk biaya pajak pembeli dan pengurusan surat di notaris.",
    };
  }

  return {
    text: isEn
      ? "I recommend checking out Serenity Tower Residence in Sentul. It features a bright modern layout, spacious family rooms, and an interactive 3D tour you can explore right now."
      : "Saya menyarankan Anda melihat Serenity Tower Residence di Sentul. Rumah ini memiliki tata ruang modern yang terang, lingkungan sejuk, serta tampilan 3D lengkap yang bisa langsung Anda jelajahi.",
    link: "/properties/serenity-tower-residence",
    title: isEn ? "View Serenity Tower in 3D" : "Lihat Serenity Tower 3D",
  };
}
