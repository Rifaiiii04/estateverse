import { apiClient } from "./client";
import { DashboardSummary, Property, PropertyInput } from "@/types/property";

// Retrieves paginated list of published properties for public browsing.
export async function getPublicProperties(page = 1, limit = 12): Promise<{
  properties: Property[];
  total: number;
  page: number;
}> {
  return apiClient<{ properties: Property[]; total: number; page: number }>(
    `/properties?page=${page}&limit=${limit}`,
    { method: "GET" }
  );
}

// Retrieves public property details and images by unique slug identifier.
export async function getPublicProperty(slug: string): Promise<Property> {
  return apiClient<Property>(`/properties/${slug}`, { method: "GET" });
}

// Retrieves all properties owned by the currently authenticated seller.
export async function getDashboardProperties(): Promise<Property[]> {
  return apiClient<Property[]>("/dashboard/properties", { method: "GET" });
}

// Retrieves property metrics summary counters for seller dashboard.
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>("/dashboard/summary", { method: "GET" });
}

// Retrieves property data for editing by primary key ID.
export async function getOwnerProperty(id: number): Promise<Property> {
  return apiClient<Property>(`/dashboard/properties/${id}`, { method: "GET" });
}

// Creates a new property listing under the authenticated seller.
export async function createProperty(input: PropertyInput): Promise<Property> {
  return apiClient<Property>("/properties", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Updates an existing property listing owned by the seller.
export async function updateProperty(
  id: number,
  input: PropertyInput
): Promise<Property> {
  return apiClient<Property>(`/properties/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// Deletes a property owned by the authenticated seller.
export async function deleteProperty(id: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/properties/${id}`, {
    method: "DELETE",
  });
}

// Uploads a property photo file and returns its storage path.
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await apiClient<{ path: string }>("/upload/image", {
    method: "POST",
    body: formData,
  });
  return res.path;
}

// Uploads a 3D GLB house model file and returns its storage path.
export async function uploadModel(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("model", file);
  const res = await apiClient<{ path: string }>("/upload/model", {
    method: "POST",
    body: formData,
  });
  return res.path;
}
