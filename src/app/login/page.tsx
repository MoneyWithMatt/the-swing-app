import { LockKeyhole, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { login, signup } from "./actions";
import { FieldLabel, LinkButton, PageShell, TextInput, TopBar } from "@/components/ui/primitives";
import { getAuthenticatedUser, isCoachUser } from "@/lib/server/supabase-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const user = await getAuthenticatedUser();
  if (user) redirect(isCoachUser(user) ? "/coach/pilot" : "/account");
  const query = await searchParams;
  return <PageShell>
    <TopBar eyebrow="The Swing App" title="Your account" actions={<LinkButton href="/" variant="secondary">Home</LinkButton>} />
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      <form action={login} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <LockKeyhole className="mb-3 text-moss" aria-hidden /><h2 className="text-xl font-bold">Log in</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-ink/60">Golfers see their requests. Your approved coach email opens the coach queue.</p>
        <div className="space-y-4"><div><FieldLabel>Email address</FieldLabel><TextInput name="email" type="email" autoComplete="email" required /></div><div><FieldLabel>Password</FieldLabel><TextInput name="password" type="password" autoComplete="current-password" required /></div></div>
        <button className="focus-ring mt-5 min-h-11 w-full rounded-md bg-moss px-4 text-sm font-semibold text-white">Log in</button>
      </form>
      <form action={signup} className="rounded-lg border border-moss/20 bg-moss/5 p-5 shadow-sm">
        <UserPlus className="mb-3 text-moss" aria-hidden /><h2 className="text-xl font-bold">Create a golfer account</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-ink/60">Keep transactions and written feedback together. Videos still expire to protect storage.</p>
        <div className="space-y-4"><div><FieldLabel>Your name</FieldLabel><TextInput name="fullName" autoComplete="name" required /></div><div><FieldLabel>Email address</FieldLabel><TextInput name="email" type="email" autoComplete="email" required /></div><div><FieldLabel>Password</FieldLabel><TextInput name="password" type="password" minLength={8} autoComplete="new-password" required /></div><div><FieldLabel>Confirm password</FieldLabel><TextInput name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></div>
          <label className="flex items-start gap-3 text-sm leading-6 text-ink/70"><input className="mt-1 h-4 w-4 accent-moss" type="checkbox" name="ageConfirmed" value="yes" required /><span>I confirm I am 18 or over.</span></label>
          <label className="flex items-start gap-3 text-sm leading-6 text-ink/70"><input className="mt-1 h-4 w-4 accent-moss" type="checkbox" name="privacyAccepted" value="yes" required /><span>I have read the <Link className="font-bold text-moss underline" href="/privacy" target="_blank">privacy notice</Link>.</span></label>
        </div>
        <button className="focus-ring mt-5 min-h-11 w-full rounded-md border border-moss bg-white px-4 text-sm font-semibold text-moss">Create account</button>
      </form>
    </div>
    {query.error ? <p className="mx-auto mt-4 max-w-4xl rounded-md border border-clay/30 bg-clay/10 p-3 text-sm font-bold text-clay">{query.error}</p> : null}
    {query.message ? <p className="mx-auto mt-4 max-w-4xl rounded-md border border-moss/30 bg-moss/10 p-3 text-sm font-bold text-moss">{query.message}</p> : null}
  </PageShell>;
}
