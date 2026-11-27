"use client";

import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isPinInProvince, provinceBounds } from "@/lib/utils/regions";

/** A map pin in decimal degrees. */
export interface GeoPin {
  lat: number;
  lng: number;
}

interface MapPinFieldProps {
  value: GeoPin | null;
  onChange: (pin: GeoPin) => void;
  /** Province chosen in the form; the map zooms to it and warns when the pin lies outside. */
  province?: string;
}

type LeafletModule = typeof import("leaflet");

const INDONESIA_CENTER: [number, number] = [-2.5, 118];
const INDONESIA_ZOOM = 5;
const PIN_ZOOM = 17;
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// MapPinField lets the seller place the house on a map, which is later used to prove tours were recorded on site.
export function MapPinField({ value, onChange, province = "" }: MapPinFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const initialPin = useRef(value);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const start = initialPin.current;
      const map = L.map(containerRef.current, { scrollWheelZoom: false })
        .setView(start ? [start.lat, start.lng] : INDONESIA_CENTER, start ? PIN_ZOOM : INDONESIA_ZOOM);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
      map.on("click", (e: LeafletMouseEvent) => onChangeRef.current(roundPin(e.latlng)));
      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map || !value) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
      return;
    }
    const marker = L.marker([value.lat, value.lng], { draggable: true, icon: pinIcon(L), keyboard: true, title: "Lokasi rumah" }).addTo(map);
    marker.on("dragend", () => onChangeRef.current(roundPin(marker.getLatLng())));
    markerRef.current = marker;
  }, [ready, value]);

  // Zooms to the chosen province unless the existing pin is already inside it.
  useEffect(() => {
    const map = mapRef.current;
    const box = provinceBounds(province);
    if (!ready || !map || !box) return;
    const pin = valueRef.current;
    if (pin && isPinInProvince(province, pin.lat, pin.lng)) return;
    map.fitBounds([[box[0], box[2]], [box[1], box[3]]]);
  }, [ready, province]);

  // Pins the seller's current GPS position, which is the most accurate when filling the form at the house.
  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoError("Browser ini tidak mendukung lokasi.");
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pin = roundPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        onChange(pin);
        mapRef.current?.setView([pin.lat, pin.lng], PIN_ZOOM);
        setLocating(false);
      },
      () => {
        setGeoError("Lokasi tidak bisa diambil. Izinkan akses lokasi atau ketuk peta secara manual.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-neutral-800">Titik lokasi rumah di peta</p>
        <Button type="button" size="sm" variant="outline" onClick={useMyLocation} isLoading={locating}>
          <LocateFixed aria-hidden="true" /> Pakai lokasi saya
        </Button>
      </div>
      <div ref={containerRef} className="h-56 w-full rounded-xl border border-neutral-200 z-0" role="application" aria-label="Peta lokasi rumah. Ketuk untuk memasang pin." />
      <p className="flex items-start gap-1.5 text-xs text-neutral-600">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {value ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. ` : "Belum ada pin. "}
        Dipakai untuk membuktikan tur 360° direkam di rumah ini. Ketuk peta atau geser pin untuk mengubah.
      </p>
      {geoError && <p role="alert" className="text-xs text-rose-700">{geoError}</p>}
      {value && province && !isPinInProvince(province, value.lat, value.lng) && (
        <p role="alert" className="text-xs font-semibold text-amber-800">
          Pin berada di luar provinsi {province}. Geser pin ke lokasi rumah yang sebenarnya.
        </p>
      )}
    </div>
  );
}

// roundPin keeps six decimals (about 10 cm), matching the database precision.
function roundPin({ lat, lng }: GeoPin): GeoPin {
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// pinIcon draws the marker with CSS so no image assets are needed.
function pinIcon(L: LeafletModule) {
  return L.divIcon({
    className: "",
    html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;background:#356859;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 27], // tip of the rotated drop shape
  });
}
