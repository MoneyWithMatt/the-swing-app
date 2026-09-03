"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser, isCoachUser } from "@/lib/server/supabase-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import { supabaseRest, uploadCoachPhoto } from "@/lib/server/supabase-rest";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveCoachProfile(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user || !isCoachUser(user)) redirect("/login");
  const displayName = String(formData.get("displayName") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sports = ["golf"];
  if (!displayName || displayName.length > 80 || description.length > 500) redirect("/coach/profile?error=Check+the+profile+details.");
  const existing = await getCoachProfile(user.id);
  const photo = formData.get("photo");
  let photoPath = existing?.photo_path;
  if (photo instanceof File && photo.size) {
    if (photo.size > 2 * 1024 * 1024 || !IMAGE_TYPES.has(photo.type)) redirect("/coach/profile?error=Use+a+JPG,+PNG+or+WebP+photo+under+2+MB.");
    const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    photoPath = `profiles/${user.id}/profile.${extension}`;
    await uploadCoachPhoto(photoPath, photo);
  }
  await supabaseRest("/rest/v1/coach_profiles?on_conflict=user_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ user_id: user.id, display_name: displayName, description, sports, photo_path: photoPath || null, active: true, updated_at: new Date().toISOString() })
  });
  redirect("/coach/profile?saved=true");
}
