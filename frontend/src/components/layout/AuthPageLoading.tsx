import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// AuthPageLoading keeps an auth form hidden while the session is checked or a signed-in seller is redirected.
export function AuthPageLoading() {
  return (
    <main id="main-content" className="flex-1 min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner text="Memeriksa sesi..." />
    </main>
  );
}
