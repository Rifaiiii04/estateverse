import { apiClient } from "./client";

export interface Lead {
  id: number;
  property_id: number;
  owner_id: number;
  name: string;
  phone: string;
  budget: string;
  note: string;
  viewed_tour: boolean;
  status: "new" | "contacted" | "scheduled" | "closed";
  property_title?: string;
  property_slug?: string;
  created_at: string;
  updated_at: string;
}

// getOwnerLeads fetches all buyer inquiries from the database for the authenticated seller.
export async function getOwnerLeads(): Promise<Lead[]> {
  const data = await apiClient<{ leads: Lead[]; total: number }>("/owner/leads");
  return data.leads || [];
}

// updateLeadStatus modifies a lead's pipeline status in the database.
export async function updateLeadStatus(id: number, status: string): Promise<void> {
  await apiClient(`/owner/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// submitBuyerInquiry sends a public prospective buyer inquiry to the database.
export async function submitBuyerInquiry(payload: {
  property_id: number;
  name: string;
  phone: string;
  budget?: string;
  note: string;
  viewed_tour?: boolean;
}): Promise<Lead> {
  return apiClient<Lead>("/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
