"use client";

import React, { useState } from "react";
import { Property, PropertyInput, PropertyStatus } from "@/types/property";
import { formatRupiahInput, parseRupiahInput } from "@/lib/utils/formatters";
import { useToast } from "@/context/ToastContext";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { PropertyFormHeader, PropertySaveButton } from "./PropertyFormHeader";
import { GeoPin, MapPinField } from "./MapPinField";
import { LocationSelector } from "./LocationSelector";
import { DimensionsInputGrid, preventNonNumericKey } from "./DimensionsInputGrid";
import { ImageGalleryUploader } from "./ImageGalleryUploader";
import { PropertyModelUploader } from "./PropertyModelUploader";
import { PropertyBenefitsInput } from "./PropertyBenefitsInput";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import { FadeIn } from "@/components/ui/MotionPrimitives";

const propertyTypeOptions: SelectOption[] = [
  { value: "house", label: "Rumah (House)", description: "Hunian tapak mandiri" },
  { value: "villa", label: "Villa", description: "Hunian peristirahatan / resort" },
  { value: "townhouse", label: "Townhouse", description: "Hunian deret perkotaan" },
  { value: "cluster", label: "Cluster", description: "Perumahan gerbang tunggal" },
];

interface PropertyFormProps {
  initialData?: Property;
  /** Walk Inside 360° recorder section shown first in the media column. */
  walkInsideSlot?: React.ReactNode;
  onSubmit: (data: PropertyInput) => Promise<void>;
  isSubmitting?: boolean;
}

// PropertyForm renders a compact 2-column seller workspace for creating and editing property listings.
export function PropertyForm({
  initialData,
  walkInsideSlot,
  onSubmit,
  isSubmitting = false,
}: PropertyFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [propertyType, setPropertyType] = useState(initialData?.property_type || "house");
  const [priceRaw, setPriceRaw] = useState(initialData?.price ? String(initialData.price) : "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [province, setProvince] = useState(initialData?.province || "");
  const [pin, setPin] = useState<GeoPin | null>(initialPin(initialData));
  const [landArea, setLandArea] = useState(initialData?.land_area ? String(initialData.land_area) : "");
  const [buildingArea, setBuildingArea] = useState(initialData?.building_area ? String(initialData.building_area) : "");
  const [bedrooms, setBedrooms] = useState(initialData?.bedrooms ? String(initialData.bedrooms) : "3");
  const [bathrooms, setBathrooms] = useState(initialData?.bathrooms ? String(initialData.bathrooms) : "2");
  const [floors, setFloors] = useState(initialData?.floors ? String(initialData.floors) : "1");
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp_number || "");
  const [status, setStatus] = useState<PropertyStatus>(initialData?.status || "draft");
  const [images, setImages] = useState<string[]>(initialData?.images?.map((i) => i.file_path) || []);
  const [benefits, setBenefits] = useState<string[]>(initialData?.benefits || []);
  const [model3DPath, setModel3DPath] = useState(initialData?.model_3d_path || "");
  const [errorMessage, setErrorMessage] = useState("");

  // Validates form fields and dispatches the property payload.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const parsedPrice = parseRupiahInput(priceRaw);
    if (title.trim().length < 3 || description.trim().length < 10) {
      const msg = "Periksa judul (min. 3 karakter) dan deskripsi (min. 10 karakter).";
      setErrorMessage(msg);
      toast.warning(msg, "Form Belum Lengkap");
      return;
    }
    if (parsedPrice <= 0 || !province || !city) {
      const msg = "Harga, provinsi, dan kota/kabupaten wajib dipilih dengan benar.";
      setErrorMessage(msg);
      toast.warning(msg, "Lokasi / Harga Belum Dipilih");
      return;
    }
    const cleanWa = whatsapp.replace(/[^0-9]/g, "");
    if (cleanWa.length < 9 || cleanWa.length > 15) {
      const msg = "Nomor WhatsApp harus valid (9-15 digit angka).";
      setErrorMessage(msg);
      toast.warning(msg, "Nomor WhatsApp Tidak Valid");
      return;
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      property_type: propertyType,
      price: parsedPrice,
      address: address.trim(),
      city: city.trim(),
      province: province.trim(),
      latitude: pin?.lat ?? null,
      longitude: pin?.lng ?? null,
      land_area: Number(landArea) || 1,
      building_area: Number(buildingArea) || 1,
      bedrooms: Math.max(1, Number(bedrooms) || 1),
      bathrooms: Math.max(1, Number(bathrooms) || 1),
      floors: Math.max(1, Number(floors) || 1),
      whatsapp_number: cleanWa,
      model_3d_path: model3DPath,
      benefits,
      status,
      images,
    });
  };

  return (
    <FadeIn y={14}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <PropertyFormHeader editingTitle={initialData?.title} status={status} onStatusChange={setStatus} isSubmitting={isSubmitting} />

        {errorMessage && <Alert type="error" message={errorMessage} />}

        {/* 2-Column Compact Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-950 border-b border-neutral-100 pb-2.5">
                1. Informasi Dasar, Harga &amp; Benefit Rumah
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-6">
                  <Input label="Judul Properti *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Rumah 2 Kamar Dekat Kampus Purwokerto" required />
                </div>
                <div className="sm:col-span-3">
                  <CustomSelect label="Tipe Properti" options={propertyTypeOptions} value={propertyType} onChange={setPropertyType} />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Harga (IDR) *"
                    type="text"
                    inputMode="numeric"
                    value={priceRaw ? formatRupiahInput(priceRaw) : ""}
                    onKeyDown={preventNonNumericKey}
                    onChange={(e) => setPriceRaw(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Rp 385.000.000"
                    required
                  />
                </div>
              </div>
              <Textarea
                label="Deskripsi Arsitektur & Fasilitas *"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ceritakan kondisi rumah dengan jujur: tahun dibangun, renovasi, air & listrik, akses jalan, dan lingkungan sekitar..."
                required
              />
              <PropertyBenefitsInput benefits={benefits} onChange={setBenefits} />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-950 border-b border-neutral-100 pb-2.5">
                2. Lokasi, Dimensi &amp; Kontak
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-8">
                  <LocationSelector province={province} city={city} onProvinceChange={setProvince} onCityChange={setCity} />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    label="WhatsApp Seller *"
                    type="tel"
                    inputMode="numeric"
                    value={whatsapp}
                    onKeyDown={preventNonNumericKey}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="08123456789"
                    required
                  />
                </div>
              </div>
              <Input label="Alamat Lengkap *" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Karang Mas Sejahtera No. 15" required />
              <MapPinField value={pin} onChange={setPin} />
              <DimensionsInputGrid
                landArea={landArea}
                buildingArea={buildingArea}
                bedrooms={bedrooms}
                bathrooms={bathrooms}
                floors={floors}
                onLandAreaChange={setLandArea}
                onBuildingAreaChange={setBuildingArea}
                onBedroomsChange={setBedrooms}
                onBathroomsChange={setBathrooms}
                onFloorsChange={setFloors}
              />
            </div>
          </div>

          {/* Right Column: Walk Inside 360°, photos, and optional 3D model */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {walkInsideSlot}
            <PropertyModelUploader model3DPath={model3DPath} onChange={setModel3DPath} onError={setErrorMessage} />
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
              <ImageGalleryUploader images={images} onChange={setImages} onError={setErrorMessage} />
            </div>
          </div>
        </div>

        {/* Phones save from the very bottom, after every section has been reviewed. */}
        <PropertySaveButton editing={Boolean(initialData)} isSubmitting={isSubmitting} className="w-full md:hidden" />
      </form>
    </FadeIn>
  );
}

// initialPin reads the stored map pin of a listing being edited, if it has one.
function initialPin(property?: Property): GeoPin | null {
  if (property?.latitude == null || property.longitude == null) return null;
  return { lat: property.latitude, lng: property.longitude };
}
