import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchMyProfile, updateMyProfile } from "@/lib/chat/queries";
import { UserAvatar } from "./user-avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { validateFileUpload, sanitizeFileName } from "@/lib/security/file-validation";
import { supabase } from "@/integrations/supabase/client";

export function ProfileDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchMyProfile(userId),
    enabled: open,
  });

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setDepartment(profile.department ?? "");
      setDesignation(profile.designation ?? "");
      setEmployeeCode(profile.employee_id ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setAvatarFile(null);
      setPreviewUrl(null);
    }
  }, [profile, open]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG and WebP images are allowed.");
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    setAvatarFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = async () => {
    // If it's a locally selected file that hasn't been uploaded/saved yet, just clear local state
    if (previewUrl && !profile?.avatar_url) {
      setAvatarFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const oldAvatarUrl = profile?.avatar_url;
    if (!oldAvatarUrl) return;

    setIsDeleting(true);
    try {
      // 1. Update DB profile avatar_url to null
      await updateMyProfile(userId, {
        full_name: fullName.trim() || null,
        avatar_url: null,
      });

      // 2. Delete storage file if private
      const isPrivate = !oldAvatarUrl.startsWith("http://") && !oldAvatarUrl.startsWith("https://");
      if (isPrivate) {
        const { error: deleteErr } = await supabase.storage
          .from("profile-avatars")
          .remove([oldAvatarUrl]);
        if (deleteErr) {
          console.error("Failed to delete storage file:", deleteErr);
        }
      }

      setAvatarUrl("");
      setAvatarFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Invalidate queries
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      qc.invalidateQueries({ queryKey: ["department-documents"] });

      toast.success("Photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove photo");
    } finally {
      setIsDeleting(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      let finalAvatarUrl = avatarUrl;
      const oldAvatarUrl = profile?.avatar_url;

      // 1. Upload new image first if selected
      if (avatarFile) {
        const validation = validateFileUpload(avatarFile, {
          maxSizeBytes: 5 * 1024 * 1024,
          requireImage: true,
        });
        if (!validation.valid) {
          throw new Error(validation.error || "Invalid avatar image format.");
        }

        const safeName = sanitizeFileName(avatarFile.name);
        const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("profile-avatars")
          .upload(path, avatarFile, {
            contentType: avatarFile.type,
            upsert: false,
          });

        if (uploadErr) {
          throw new Error(`Upload failed: ${uploadErr.message}`);
        }

        finalAvatarUrl = path;
      }

      // 2. Update profile
      await updateMyProfile(userId, {
        full_name: fullName.trim() || null,
        employee_id: employeeCode.trim() || null,
        avatar_url: finalAvatarUrl || null,
      });

      // 3. Delete old storage image if it was replaced and it was a private path
      if (avatarFile && oldAvatarUrl) {
        const oldIsPrivate =
          !oldAvatarUrl.startsWith("http://") && !oldAvatarUrl.startsWith("https://");
        if (oldIsPrivate) {
          const { error: deleteErr } = await supabase.storage
            .from("profile-avatars")
            .remove([oldAvatarUrl]);
          if (deleteErr) {
            console.error("Failed to delete old avatar file:", deleteErr);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setAvatarFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Invalidate queries
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      qc.invalidateQueries({ queryKey: ["department-documents"] });

      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const isPending = save.isPending || isDeleting;
  const hasPhoto = !!(previewUrl || avatarUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        {profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <UserAvatar
                profile={{
                  ...profile,
                  avatar_url: previewUrl || avatarUrl || null,
                }}
                size="xl"
              />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                  >
                    {save.isPending && avatarFile ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    {hasPhoto ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {hasPhoto && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemovePhoto}
                      disabled={isPending}
                    >
                      {isDeleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Remove Photo
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dept">Department</Label>
                <Input
                  id="dept"
                  value={department}
                  readOnly
                  className="bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desig">Designation</Label>
                <Input
                  id="desig"
                  value={designation}
                  readOnly
                  className="bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employee-code">Employee Code</Label>
              <Input
                id="employee-code"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="Enter your company employee code"
                maxLength={80}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter the employee code assigned to you by your company.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Department and designation are managed by company administrators.
            </p>
            <p className="text-xs text-muted-foreground">Signed in as {profile.email}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={isPending}>
            {save.isPending && !avatarFile && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
