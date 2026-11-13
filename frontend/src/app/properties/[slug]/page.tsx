"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { AlertCircle, Box, Camera, ShieldCheck } from "lucide-react";
import { Property } from "@/types/property";
import { getPublicProperty } from "@/lib/api/properties";
import { getMediaUrl } from "@/lib/api/client";
import { formatIDR } from "@/lib/utils/formatters";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertySpecs } from "@/components/properties/PropertySpecs";
import { PropertyDetailHeader } from "@/components/properties/PropertyDetailHeader";
import { PropertyMediaStage } from "@/components/properties/PropertyMediaStage";
import { PropertyBenefitsCard } from "@/components/properties/PropertyBenefitsCard";
import { PropertyLeadForm } from "@/components/properties/PropertyLeadForm";
import { PropertyMortgageCard } from "@/components/properties/PropertyMortgageCard";
import { WhatsAppButton } from "@/components/properties/WhatsAppButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FadeIn } from "@/components/ui/MotionPrimitives";
import { useToast } from "@/context/ToastContext";

// PropertyDetailPage presents a compact split-workspace with default photo preview and on-demand cloud 3D streaming.
export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // Default preview is always "photos"; 3D model is streamed only when requested by the user.
  const [activeTab, setActiveTab] = useState<"photos" | "3d">("photos");

  useEffect(() => {
    let isMounted = true;
    getPublicProperty(resolvedParams.slug)
      .then((data) => {
        if (isMounted) setProperty(data);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Properti tidak ditemukan.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedParams.slug]);

  // Copies the current property URL to clipboard for effortless sharing.
  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Tautan properti berhasil disalin ke clipboard.");
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20 bg-neutral-50/50">
          <LoadingSpinner text="Memuat detail properti..." />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center bg-neutral-50/50">
          <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3 text-neutral-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-1.5">Properti Tidak Ditemukan</h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mb-5">
            Listing yang Anda cari mungkin telah terjual, dinonaktifkan, atau URL yang Anda tuju keliru.
          </p>
          <Link href="/properties">
            <button
              type="button"
              className="bg-sage-600 hover:bg-sage-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Kembali ke Katalog Properti
            </button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const modelFullUrl = property.model_3d_path ? getMediaUrl(property.model_3d_path) : undefined;
  const pricePerM2 =
    property.building_area > 0 ? Math.round(property.price / property.building_area) : 0;

  return (
    <>
      <Navbar />

      <main className="flex-1 py-5 sm:py-7 bg-neutral-50/60">
        <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 space-y-5">
          <FadeIn y={12}>
            <PropertyDetailHeader
              property={property}
              onShare={handleShare}
              activeTab={activeTab}
              onSwitchTab={setActiveTab}
            />
          </FadeIn>

          {/* Compact 2-Column Split Grid: Media & Specs on Left (8 cols) | Price & Actions on Right (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Default Photo Stage / On-Demand 3D + Specs + Benefits + Description */}
            <div className="lg:col-span-8 space-y-4">
              <PropertyMediaStage
                title={property.title}
                images={property.images}
                modelUrl={modelFullUrl}
                metadata={property.model_metadata}
                activeTab={activeTab}
                onSwitchTab={setActiveTab}
              />

              <FadeIn delay={0.06} y={14}>
                <PropertySpecs
                  landArea={property.land_area}
                  buildingArea={property.building_area}
                  bedrooms={property.bedrooms}
                  bathrooms={property.bathrooms}
                  floors={property.floors}
                />
              </FadeIn>

              <FadeIn delay={0.1} y={14}>
                <PropertyBenefitsCard benefits={property.benefits} />
              </FadeIn>

              <FadeIn delay={0.14} y={14}>
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-neutral-950 border-b border-neutral-100 pb-2">
                    Keterangan Lengkap Rumah
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed whitespace-pre-line font-normal">
                    {property.description}
                  </p>
                </div>
              </FadeIn>
            </div>

            {/* Right Sticky Sidebar: Price, Cloud 3D Trigger, WhatsApp Owner, Visit Form, KPR */}
            <FadeIn delay={0.08} y={16} className="lg:col-span-4 lg:sticky lg:top-22 space-y-4">
              {/* Primary Price & Seller Action Card */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3.5">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                      Harga Penawaran
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-sage-700 tracking-tight mt-0.5">
                      {formatIDR(property.price)}
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">
                      Estimasi Rp {pricePerM2.toLocaleString("id-ID")} / m²
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "photos" ? "3d" : "photos")}
                    className={`h-9 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                      activeTab === "3d"
                        ? "bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-200"
                        : "bg-sage-50 text-sage-800 border-sage-200 hover:bg-sage-100"
                    }`}
                  >
                    {activeTab === "3d" ? (
                      <>
                        <Camera className="w-3.5 h-3.5 text-sage-600" />
                        <span>Lihat Foto</span>
                      </>
                    ) : (
                      <>
                        <Box className="w-3.5 h-3.5 text-sage-600" />
                        <span>Buka 3D</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Seller Verification & Direct WhatsApp */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                        Dikelola Oleh
                      </span>
                      <span className="text-sm font-bold text-neutral-950">
                        {property.owner_name || "EstateVerse Verified Seller"}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="w-3 h-3 text-sage-600" />
                      <span>Terverifikasi</span>
                    </span>
                  </div>

                  <WhatsAppButton
                    phone={property.whatsapp_number}
                    propertyTitle={property.title}
                    size="md"
                    className="w-full"
                  />
                </div>
              </div>

              <PropertyLeadForm propertyId={property.id} propertyTitle={property.title} />

              <PropertyMortgageCard price={property.price} />
            </FadeIn>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
