import { api } from './client';
import { getOwnedProperty } from './properties';
import { propertyPayload } from './propertyMapping';
import { uploadListingImage } from './uploads';
import type { PropertyInput, PropertyStatus } from '@/types/property';

// saveProperty uploads new media and submits a server-validated listing with no client owner override.
interface SavedPropertyState { id: number; status: PropertyStatus }

// saveProperty returns the server's final publication state after saving listing fields.
async function saveProperty(input: PropertyInput, id?: number): Promise<SavedPropertyState> {
  const paths: string[] = [];
  for (const uri of input.imagePaths) paths.push(await uploadListingImage(uri));
  const result = await api<{ id: number; status?: PropertyStatus }>(id ? `/properties/${id}` : '/properties', {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(propertyPayload(input, paths)),
  });
  return { id: result.id, status: result.status || input.status };
}

// createProperty creates a listing in MySQL so native captures receive a valid backend property id.
export async function createProperty(input: PropertyInput) { return (await saveProperty(input)).id; }

// updateProperty saves an owned listing through backend authorization.
export async function updateProperty(id: number, input: PropertyInput) { return saveProperty(input, id); }

// setPropertyStatus retains the existing listing media while switching publication status.
export async function setPropertyStatus(id: number, status: PropertyStatus) {
  const p = await getOwnedProperty(id);
  await updateProperty(id, { ...p, status, imagePaths: p.images.map((i) => i.filePath) });
}

// deleteProperty removes a server-owned listing without deleting unrelated device files.
export async function deleteProperty(id: number) { await api(`/properties/${id}`, { method: 'DELETE' }); }
