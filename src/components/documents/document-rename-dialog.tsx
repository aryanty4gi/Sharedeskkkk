import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EnterpriseDocument } from "@/lib/documents/types";

interface DocumentRenameDialogProps {
  document: EnterpriseDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (doc: EnterpriseDocument, newName: string) => Promise<void>;
}

export function DocumentRenameDialog({
  document,
  open,
  onOpenChange,
  onConfirm,
}: DocumentRenameDialogProps) {
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setFileName(document.file_name);
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !fileName.trim()) return;

    setSaving(true);
    try {
      await onConfirm(document, fileName.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>Enter a new display file name for this document.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Q3_Report.pdf"
              className="text-sm"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !fileName.trim()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
