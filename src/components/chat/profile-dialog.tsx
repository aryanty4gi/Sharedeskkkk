import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchMyProfile, updateMyProfile } from "@/lib/chat/queries";
import { UserAvatar } from "./user-avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ProfileDialog({
  open, onOpenChange, userId,
}: { open: boolean; onOpenChange: (v: boolean) => void; userId: string }) {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchMyProfile(userId),
    enabled: open,
  });

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setDepartment(profile.department ?? "");
      setDesignation(profile.designation ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile(userId, {
        full_name: fullName.trim() || null,
        department: department.trim() || null,
        designation: designation.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        {profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <UserAvatar profile={{ ...profile, avatar_url: avatarUrl || profile.avatar_url }} size="xl" />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dept">Department</Label>
                <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desig">Designation</Label>
                <Input id="desig" value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={80} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Signed in as {profile.email}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
