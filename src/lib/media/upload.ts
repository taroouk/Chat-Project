import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type UploadResult = {
  publicUrl: string;
  path: string;
};

function extFromFileName(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "jpg";
}

function randomId() {
  return crypto.randomUUID();
}

export async function uploadImagesToMediaBucket(files: File[]) {
  const supabase = createSupabaseBrowserClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not authenticated");
  const uid = userRes.user.id;

  const uploaded: UploadResult[] = [];

  for (const file of files) {
    const ext = extFromFileName(file.name);
    const path = `${uid}/posts/${randomId()}.${ext}`;

    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    uploaded.push({ publicUrl: data.publicUrl, path });
  }

  return uploaded;
}

export async function uploadAvatarToMediaBucket(file: File) {
  const supabase = createSupabaseBrowserClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not authenticated");
  const uid = userRes.user.id;

  const ext = extFromFileName(file.name);
  const path = `${uid}/avatar/${randomId()}.${ext}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}