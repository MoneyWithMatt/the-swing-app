"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";
import { supabaseRest } from "@/lib/server/supabase-rest";
import { sendPilotEmail } from "@/lib/server/email";

export async function requestAccountDeletion() {
  const user = await getAuthenticatedUser();
  if (!user?.email) redirect("/login");
  await supabaseRest("/rest/v1/privacy_requests", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ user_id: user.id, email: user.email, request_type: "erasure" }) });
  await sendPilotEmail({ to: process.env.COACH_EMAIL || "moneywithmattuk@gmail.com", subject: "Swing App account deletion request", idempotencyKey: `privacy-erasure-${user.id}`, html: `<p>${user.email} has requested account deletion.</p><p>Verify and complete this request within the applicable legal deadline.</p>` }).catch(console.error);
  redirect("/account?privacy=requested");
}
