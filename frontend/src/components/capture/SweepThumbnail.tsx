/* eslint-disable @next/next/no-img-element */

// Displays the accumulated spherical contact preview before the full panorama is stitched.
export function SweepThumbnail({ preview }: { preview: string }) {
  return (
    <div className="mx-auto flex h-[min(19dvh,8rem)] w-full items-center justify-center rounded-lg bg-neutral-900">
      {preview && <img src={preview} alt="Pratinjau area ruangan yang telah terfoto" className="h-full w-full object-contain" />}
    </div>
  );
}
