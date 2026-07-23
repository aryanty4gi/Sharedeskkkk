import { useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { createDepartmentInDb } from "@/lib/admin/queries";

interface CreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDepartmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDepartmentDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setSaving(true);
    try {
      await createDepartmentInDb({
        name,
        code,
        description,
      });

      toast.success(`Created department "${name.trim()}"`);
      setName("");
      setCode("");
      setDescription("");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <span>Create Department</span>
            </DialogTitle>
            <DialogDescription>
              Add a new company department to organize employees and documents.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">Department Name *</Label>
              <Input
                id="deptName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Product Engineering"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deptCode">Department Code *</Label>
              <Input
                id="deptCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ENG"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deptDesc">Description (Optional)</Label>
              <Textarea
                id="deptDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe department scope and responsibilities..."
                rows={3}
              />
            </div>
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
            <Button type="submit" disabled={saving || !name.trim() || !code.trim()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
