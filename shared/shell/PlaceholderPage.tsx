import Link from "next/link";
import { buttonClasses } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/States";
import { PageHeader } from "./PageHeader";

/**
 * Deliberate placeholder for not-yet-built destinations.
 * Never a broken link, never fake content.
 */
export function PlaceholderPage({
  title,
  description,
  message,
}: {
  title: string;
  description: string;
  message: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        headingLevel={2}
        title={`${title} is on its way`}
        message={message}
        action={
          <Link href="/" className={buttonClasses({ variant: "secondary", className: "mt-3" })}>
            Back to Home
          </Link>
        }
      />
    </div>
  );
}
