import { Loading } from "@/shared/ui/States";

export default function LoadingFallback() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6">
      <Loading label="Loading…" />
    </main>
  );
}
