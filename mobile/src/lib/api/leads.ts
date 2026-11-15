import { api } from './client';
import type { Lead, LeadInput, LeadStatus } from '@/types/property';

// createLead sends the buyer's inquiry to the same seller inbox as the web form.
export async function createLead(input: LeadInput) {
  await api('/leads', { method: 'POST', body: JSON.stringify({ property_id: input.propertyId,
    name: input.name, phone: input.phone, note: input.note }) });
}

// listOwnedLeads retrieves inquiries authorized by the server session and filters them for the mobile UI.
export async function listOwnedLeads(status: LeadStatus | 'all', keyword: string): Promise<Lead[]> {
  const result = await api<{ leads: { id: number; property_id: number; property_title: string; name: string;
    phone: string; note: string; status: LeadStatus; created_at: string }[] }>('/owner/leads');
  return result.leads.map((l) => ({ id: l.id, propertyId: l.property_id, propertyTitle: l.property_title,
    name: l.name, phone: l.phone, note: l.note, status: l.status, createdAt: l.created_at }))
    .filter((l) => (status === 'all' || l.status === status)
      && `${l.name} ${l.propertyTitle}`.toLowerCase().includes(keyword.toLowerCase()));
}

// updateLeadStatus updates only inquiries owned by the authenticated backend seller.
export async function updateLeadStatus(id: number, status: LeadStatus) {
  await api(`/owner/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
