import type { Metadata } from "next";
import { Suspense } from "react";
import { ShoppingListScreen } from "@/features/shopping/ShoppingListScreen";
import { Loading } from "@/shared/ui/States";

export const metadata: Metadata = { title: "Shopping List" };

/** Static shell; the list lives on this device and is read on the client. */
export default function ListsPage() {
  return (
    <Suspense fallback={<Loading label="Loading your list…" />}>
      <ShoppingListScreen />
    </Suspense>
  );
}
