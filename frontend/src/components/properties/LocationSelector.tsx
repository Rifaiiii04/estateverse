"use client";

import React, { useEffect, useState } from "react";
import { Province, getProvinces, getCities } from "@/lib/utils/regions";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";

interface LocationSelectorProps {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
}

// LocationSelector renders cascading province and city dropdowns with styled options.
export function LocationSelector({
  province,
  city,
  onProvinceChange,
  onCityChange,
}: LocationSelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    let mounted = true;
    getProvinces().then((data) => {
      if (mounted) setProvinces(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!province) {
      setCities([]);
      return;
    }
    let mounted = true;
    setIsLoadingCities(true);
    const matched = provinces.find((p) => p.name.toLowerCase() === province.toLowerCase());
    getCities(matched?.id || "", province)
      .then((data) => {
        if (mounted) {
          setCities(data);
          const matchedCity = data.find((c) => c.toLowerCase() === city.toLowerCase());
          if (matchedCity && matchedCity !== city) {
            onCityChange(matchedCity);
          } else if (!city && data.length > 0) {
            onCityChange(data[0]);
          }
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingCities(false);
      });
    return () => {
      mounted = false;
    };
  }, [province, provinces]);

  const provinceOptions: SelectOption[] = provinces.map((p) => ({
    value: p.name,
    label: p.name,
  }));

  const cityOptions: SelectOption[] = cities.map((c) => ({
    value: c,
    label: c,
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <CustomSelect
        label="Provinsi *"
        options={provinceOptions}
        value={province}
        onChange={onProvinceChange}
        placeholder="Pilih Provinsi..."
      />

      <CustomSelect
        label="Kota / Kabupaten *"
        options={cityOptions}
        value={city}
        onChange={onCityChange}
        placeholder={isLoadingCities ? "Memuat kota..." : "Pilih Kota / Kabupaten..."}
        disabled={!province || isLoadingCities}
      />
    </div>
  );
}
