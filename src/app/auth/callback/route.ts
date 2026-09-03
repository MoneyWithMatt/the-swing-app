import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createAuthClient } from "@/lib/server/supabase-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const client = await createAuthClient();
  let confirmed = false;

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    confirmed = !error;
  } else if (tokenHash && type) {
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
    confirmed = !error;
  }

  if (confirmed) {
    await client.auth.signOut();
    return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent("Email confirmed. You can now log in.")}`, url.origin));
  }

  const detail = url.searchParams.get("error_description");
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(detail || "That confirmation link is invalid or has expired. Request a new signup email and try again.")}`, url.origin));
}
