"use client";

import React, { useEffect, useState } from "react";
import { Property, DashboardSummary } from "@/types/property";
import { getDashboardProperties, getDashboardSummary, deleteProperty } from "@/lib/api/properties";
import { useToast } from "@/context/ToastContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/Alert";
import { DashboardMetricCards } from "@/components/dashboard/DashboardMetricCards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { ActiveAdvertisements } from "@/components/dashboard/ActiveAdvertisements";
import { ListingEfficiency } from "@/components/dashboard/ListingEfficiency";
import { FadeIn } from "@/components/ui/MotionPrimitives";

// DashboardPage displays the seller analytical overview, interactive charts, and active property listings.
export default function DashboardPage() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [sum, props] = await Promise.all([
        getDashboardSummary(),
        getDashboardProperties(),
      ]);
      setSummary(sum);
      setProperties(props);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getDashboardSummary(), getDashboardProperties()])
      .then(([sum, props]) => {
        if (isMounted) {
          setSummary(sum);
          setProperties(props);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat data dashboard.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus properti "${title}"?`)) return;
    try {
      await deleteProperty(id);
      toast.success(`Properti "${title}" berhasil dihapus.`, "Properti Dihapus");
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus properti.";
      setError(msg);
      toast.error(msg, "Gagal Menghapus Properti");
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoadingSpinner text="Memuat analitik & data properti real..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && <Alert type="error" message={error} />}

      {/* Top 4 Key Decision Metric Cards */}
      <FadeIn y={12}>
        <DashboardMetricCards summary={summary} />
      </FadeIn>

      {/* Middle Analytical Charts */}
      <FadeIn delay={0.07} y={14}>
        <DashboardCharts summary={summary} />
      </FadeIn>

      {/* Bottom Section: Active Advertisements and Listing Efficiency */}
      <FadeIn delay={0.14} y={14} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <ActiveAdvertisements
            properties={properties}
            onDelete={handleDelete}
          />
        </div>
        <div className="lg:col-span-4">
          <ListingEfficiency
            summary={summary}
            properties={properties}
          />
        </div>
      </FadeIn>
    </div>
  );
}
