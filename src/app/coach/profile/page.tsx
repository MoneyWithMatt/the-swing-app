import Image from "next/image";
import { redirect } from "next/navigation";
import { saveCoachProfile } from "./actions";
import { FieldLabel, LinkButton, PageShell, SectionHeading, TextArea, TextInput, TopBar } from "@/components/ui/primitives";
import { coachPhotoUrl, getCoachProfile } from "@/lib/server/coach-profiles";
import { getAuthenticatedUser, isCoachUser } from "@/lib/server/supabase-auth";

export const dynamic = "force-dynamic";

export default async function CoachProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user || !isCoachUser(user)) redirect("/login");
  const profile = await getCoachProfile(user.id);
  const query = await searchParams;
  const photoUrl = coachPhotoUrl(profile?.photo_path);
  return <PageShell>
    <TopBar eyebrow="Coach account" title={profile ? "Edit coach profile" : "Create coach profile"} actions={<LinkButton href="/coach/pilot" variant="secondary">Back to queue</LinkButton>} />
    <form action={saveCoachProfile} className="mx-auto max-w-2xl rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <SectionHeading title="Public coach profile" detail="Golfers see this when choosing who should review their swing." />
      {photoUrl ? <Image src={photoUrl} alt={profile?.display_name || "Coach"} width={144} height={144} className="mb-5 h-36 w-36 rounded-xl object-cover" /> : <div className="mb-5 flex h-36 w-36 items-center justify-center rounded-xl bg-moss/10 text-sm font-bold text-moss">Add photo</div>}
      <div className="space-y-5">
        <div><FieldLabel>Profile photo</FieldLabel><TextInput name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><p className="mt-1 text-xs text-ink/50">JPG, PNG or WebP, maximum 2 MB.</p></div>
        <div><FieldLabel>Coach name</FieldLabel><TextInput name="displayName" defaultValue={profile?.display_name || ""} maxLength={80} required /></div>
        <div><FieldLabel>Short description</FieldLabel><TextArea name="description" defaultValue={profile?.description || ""} maxLength={500} required /></div>
        <div><FieldLabel>Coaching category</FieldLabel><p className="rounded-md border border-ink/10 bg-mist px-3 py-2.5 text-sm font-bold text-ink">Golf</p></div>
      </div>
      {query.saved ? <p className="mt-4 text-sm font-bold text-moss">Profile saved.</p> : null}
      {query.error ? <p className="mt-4 text-sm font-bold text-clay">{query.error}</p> : null}
      <button className="focus-ring mt-5 min-h-11 w-full rounded-md bg-moss px-4 text-sm font-semibold text-white">Save profile</button>
    </form>
  </PageShell>;
}
