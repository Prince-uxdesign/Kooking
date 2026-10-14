import { Bookmark } from "lucide-react";
import { ListGroup, ListIcon, ListRow } from "@/shared/ui/ListGroup";

/** Route to the saved collection. Shows no counts or items it can't back up. */
export function SavedShortcut() {
  return (
    <ListGroup label="Shortcuts">
      <ListRow
        href="/saved"
        title="Saved recipes"
        meta="Kept on this device"
        leading={
          <ListIcon>
            <Bookmark size={20} strokeWidth={1.75} />
          </ListIcon>
        }
      />
    </ListGroup>
  );
}
