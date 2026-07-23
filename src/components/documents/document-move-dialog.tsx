import { useEffect, useState } from "react";
import { Loader2, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { EnterpriseDocument } from "@/lib/documents/types";
import type { DepartmentItem } from "@/lib/employees/types";

interface DocumentMoveDialogProps {
  document: EnterpriseDocument | null;
  departments: DepartmentItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (doc: EnterpriseDocument, targetDepartment: string) => Promise<void>;
}

export function DocumentMoveDialog({
  document,
  departments,
  open,
  onOpenChange,
  onConfirm,
}: DocumentMoveDialogProps) {
  const [selectedDept, setSelectedDept] = useState("");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (document) {
      setSelectedDept(document.department);
    }
  }, [document]);

  const handleMove = async () => {
    if (!document || !selectedDept.trim()) return;

    setMoving(true);
    try {
      await onConfirm(document, selectedDept.trim());
      onOpenChange(false);
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-5 text-primary" />
            <span>Move Document</span>
          </DialogTitle>
          <DialogDescription>
            Select a target department to relocate this document.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
            <span className="text-muted-foreground block">Current File:</span>
            <span className="font-semibold text-foreground block truncate">
              {document?.file_name}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDepartment">Destination Department</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger id="targetDepartment" className="text-sm">
                <SelectValue placeholder="Select target department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={moving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleMove}
            disabled={moving || !selectedDept || selectedDept === document?.department}
          >
            {moving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Move Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
