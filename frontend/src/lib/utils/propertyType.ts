const TYPE_LABELS_ID: Record<string, string> = {
  house: "Rumah",
  villa: "Villa",
  townhouse: "Townhouse",
  cluster: "Cluster",
  apartment: "Apartemen",
  land: "Kavling",
  commercial: "Komersial",
};

const TYPE_LABELS_EN: Record<string, string> = {
  house: "House",
  villa: "Villa",
  townhouse: "Townhouse",
  cluster: "Cluster",
  apartment: "Apartment",
  land: "Land",
  commercial: "Commercial",
};

// propertyTypeLabel turns a stored property_type ("house") into a readable label ("Rumah") in the active language.
export function propertyTypeLabel(type: string | undefined, isEn = false): string {
  const key = (type || "house").toLowerCase();
  const labels = isEn ? TYPE_LABELS_EN : TYPE_LABELS_ID;
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
