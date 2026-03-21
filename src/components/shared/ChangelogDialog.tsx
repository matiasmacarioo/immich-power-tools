import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Wrench, Zap } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "feature" | "fix" | "improvement";
    text: string;
  }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.21.0",
    date: "Mar 21, 2026",
    changes: [
      { type: "feature", text: "Person Nicknames (Alias) now supported and synced in the tree and local database" },
      { type: "feature", text: "Snappy Typewriter animation added for all text elements in the Relationship Graph" },
      { type: "feature", text: "Cards now intelligently swap between Full Name and Nickname on hover" },
      { type: "improvement", text: "VCF Export now includes proper name splitting, UID persistent syncing, and relationship mapping" },
      { type: "improvement", text: "Contact Merge flow is now 'Year-Aware'—it won't overwrite existing birth years with yearless phone data" },
      { type: "improvement", text: "Tree options menu now opens with a left-click and jumps directly to edit mode" },
      { type: "improvement", text: "Zoom level and pan position are now preserved when saving or updating data" },
      { type: "fix", text: "Fixed timezone/off-by-one errors in birthday parsing and simplified unknown year entry" },
    ],
  },
  {
    version: "0.20.0",
    date: "Mar 19, 2026",
    changes: [
      { type: "feature", text: "Click any person node in the Relationship Graph to browse all their photos in a full gallery" },
      { type: "feature", text: 'Lightbox now has an "Open in Immich" button in the toolbar beside the download button' },
      { type: "feature", text: "Photo thumbnail tags now show a clean circular icon button instead of a text label" },
      { type: "improvement", text: "Lightbox no longer closes the photo card when pressing Escape or clicking outside" },
      { type: "improvement", text: "Lightbox arrow navigation and buttons now work correctly inside the Relationship Graph dialog" },
      { type: "fix", text: "Fixed 404 on /api/people/[id]/assets — the route handler was missing" },
      { type: "fix", text: "Fixed blank thumbnails in person gallery (cleanUpAsset was not applied to the response)" },
      { type: "fix", text: "Removed non-existent encodedVideoPath column from asset queries" },
    ],
  },
  {
    version: "0.19.1",
    date: "Mar 18, 2026",
    changes: [
      { type: "feature", text: "Godparent / Godchild relationship type added to the Relationship Graph" },
      { type: "improvement", text: "Sibling and spouse nodes now fuse visually for a more compact tree layout" },
      { type: "improvement", text: "Relationship edges now take the shortest path and use distinct colors per type" },
      { type: "improvement", text: "Graph layout is more compact and pyramid-like" },
      { type: "fix", text: "New relationship types correctly translated and rendered in the UI" },
    ],
  },
  {
    version: "0.19.0",
    date: "Mar 15, 2026",
    changes: [
      { type: "feature", text: "Relationship Graph view for visualising family trees" },
      { type: "feature", text: "Inferred relationship badges shown on hover" },
      { type: "feature", text: "Drag-to-connect edges for adding new relationships" },
      { type: "improvement", text: "Similar faces panel integrated into person detail view" },
    ],
  },
];

const typeConfig = {
  feature: {
    icon: Sparkles,
    label: "New",
    className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  },
  improvement: {
    icon: Zap,
    label: "Improved",
    className: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  },
  fix: {
    icon: Wrench,
    label: "Fixed",
    className: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangelogDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg !p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Changelog
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            What&apos;s new in Immich Power Tools
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col divide-y">
            {CHANGELOG.map((entry, ei) => (
              <div key={entry.version} className="px-6 py-5">
                {/* Version header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">v{entry.version}</span>
                    {ei === 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        Latest
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>

                {/* Changes list */}
                <ul className="flex flex-col gap-2.5">
                  {entry.changes.map((change, ci) => {
                    const cfg = typeConfig[change.type];
                    const Icon = cfg.icon;
                    return (
                      <li key={ci} className="flex items-start gap-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${cfg.className}`}
                        >
                          <Icon size={9} />
                          {cfg.label}
                        </span>
                        <span className="text-sm text-muted-foreground leading-snug">{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
