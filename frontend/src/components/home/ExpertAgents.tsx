/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ChevronLeft, ChevronRight, Mail, Phone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Agent {
  name: string;
  role: string;
  rating: string;
  reviews: number;
  phone: string;
  image: string;
}

// ExpertAgents renders the certified property consultants roster with contact channels and bilingual copy.
export function ExpertAgents() {
  const { lang, t } = useLanguage();
  const isEn = lang === "en";

  const agents: Agent[] = [
    {
      name: "Olivia Barnes",
      role: isEn ? "Luxury Property & Villa Advisor" : "Penasihat Properti Mewah & Villa",
      rating: "5.0",
      reviews: 120,
      phone: "+62 812-3456-7890",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
    },
    {
      name: "Carlos Garcia",
      role: isEn ? "Commercial & 3D Residential Specialist" : "Spesialis Komersial & Residensial 3D",
      rating: "4.9",
      reviews: 80,
      phone: "+62 813-9876-5432",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
    },
    {
      name: "Avi Chen",
      role: isEn ? "Architectural Broker — Sentul Corridor" : "Broker Arsitektur & Kawasan Sentul",
      rating: "4.7",
      reviews: 88,
      phone: "+62 811-2233-4455",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
    },
    {
      name: "Marcus Lee",
      role: isEn ? "Bali Villa Investment Consultant" : "Konsultan Investasi Villa Bali",
      rating: "4.5",
      reviews: 76,
      phone: "+62 815-6677-8899",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
    },
  ];

  return (
    <section id="agents" className="py-16 bg-white border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header with Carousel Arrows */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
              {t.agents.title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-medium">
              {t.agents.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition-colors cursor-pointer"
              aria-label="Previous agents"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition-colors cursor-pointer"
              aria-label="Next agents"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-200/80 shadow-2xs hover:shadow-md transition-shadow"
            >
              {/* Agent Portrait Container */}
              <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden">
                <img
                  src={agent.image}
                  alt={agent.name}
                  className="w-full h-full object-cover object-top"
                />
                <span className="absolute top-3 left-3 text-[9px] font-extrabold tracking-widest text-neutral-800 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded uppercase">
                  ESTATEVERSE
                </span>
              </div>

              {/* Agent Information */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-neutral-900 leading-snug">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-neutral-500 capitalize">{agent.role}</p>

                  <div className="pt-2 text-xs text-neutral-600 font-semibold flex items-center gap-1">
                    <span className="text-neutral-950">{agent.rating}</span>
                    <span className="text-neutral-400 font-normal">/ {agent.reviews} reviews</span>
                  </div>
                </div>

                {/* Contact Action Buttons */}
                <div className="pt-3 flex items-center gap-2">
                  <a
                    href={`https://wa.me/${agent.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold py-2 px-3 rounded-lg transition-colors truncate"
                  >
                    <Phone className="w-3 h-3 text-neutral-300" />
                    <span>{agent.phone}</span>
                  </a>

                  <a
                    href={`mailto:consultant@estateverse.com?subject=Inquiry for ${agent.name}`}
                    className="w-8 h-8 rounded-lg border border-neutral-200 hover:border-neutral-950 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 transition-colors shrink-0"
                    aria-label={`Email ${agent.name}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
