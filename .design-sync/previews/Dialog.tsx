// Authored preview — the real shadcn Dialog from window.IdeophoneArena, shown in
// its open state. Overlays are the one at-rest surface allowed --shadow-raised
// (§1); the close glyph is an inline SVG. (Dialog is staged for spec §5 uses
// like a logout-mid-session confirm.)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "ideophone-arena-web";

// The open confirm dialog: overlay + centered raised panel with header + actions.
export const ConfirmLogout = () => (
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Log out of the arena?</DialogTitle>
        <DialogDescription>
          Your session progress is saved. Sign back in any time to keep going.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost">Stay signed in</Button>
        <Button variant="destructive">Log out</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
