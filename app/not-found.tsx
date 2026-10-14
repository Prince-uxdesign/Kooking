import Link from "next/link";
import { buttonClasses } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/States";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[720px] px-5 py-16 sm:px-6">
      <ErrorState
        headingLevel={1}
        title="That page isn't on the menu"
        message="It may have moved, or the link may be wrong. Your cooking progress on this device is unaffected."
      />
      <div className="mt-4 flex justify-center">
        <Link href="/" className={buttonClasses({ variant: "primary" })}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}
