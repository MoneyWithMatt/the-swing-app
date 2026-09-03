import { LinkButton, PageShell, TopBar } from "@/components/ui/primitives";

export default function CookiesPage() {
  return <PageShell><TopBar eyebrow="Legal" title="Cookie notice" actions={<LinkButton href="/" variant="secondary">Back</LinkButton>} />
    <article className="mx-auto max-w-3xl space-y-5 rounded-lg border border-ink/10 bg-white p-6 leading-7 text-ink/70 shadow-sm">
      <p className="text-sm font-bold text-ink/50">Last updated: 27 August 2026</p>
      <h2 className="text-xl font-bold text-ink">Cookies used by this app</h2>
      <p>The Swing App currently uses only strictly necessary cookies. Supabase authentication cookies keep you signed in, refresh your secure session and direct coaches and golfers to the correct account area. The service cannot provide account features without them.</p>
      <p>We do not currently use advertising, tracking or optional analytics cookies, so no optional-cookie banner is shown. Stripe may set essential security and fraud-prevention cookies when you choose to visit its checkout page; Stripe explains those cookies on its own service.</p>
      <p>If optional analytics or marketing technology is introduced later, it will remain off until you make a choice and this notice will be updated.</p>
    </article>
  </PageShell>;
}
