"use server";

import { redirect } from "next/navigation";
import { createAuthClient, isCoachUser } from "@/lib/server/supabase-auth";
import { requirePilotEnv } from "@/lib/server/pilot-env";

const field = (formData: FormData, key: string) => String(formData.get(key) || "").trim();
const fail = (message: string): never => redirect(`/login?error=${encodeURIComponent(message)}`);

export async function login(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  if (!email || !password) fail("Enter your email address and password.");
  const client = await createAuthClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  const loggedInUser = data.user;
  if (error || !loggedInUser) fail("That email address or password was not recognised.");
  redirect(isCoachUser(loggedInUser) ? "/coach/pilot" : "/account");
}

export async function signup(formData: FormData) {
  const fullName = field(formData, "fullName");
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const confirmPassword = field(formData, "confirmPassword");
  const privacyAccepted = formData.get("privacyAccepted") === "yes";
  const ageConfirmed = formData.get("ageConfirmed") === "yes";
  if (!fullName || !email || password.length < 8) fail("Add your name, a valid email and a password of at least 8 characters.");
  if (password !== confirmPassword) fail("The two passwords do not match. Please enter them again.");
  if (!privacyAccepted || !ageConfirmed) fail("Confirm that you are 18 or over and that you have read the privacy notice.");
  const client = await createAuthClient();
  const { data, error } = await client.auth.signUp({ email, password, options: {
    data: { full_name: fullName, privacy_notice_version: "2026-08-27", privacy_acknowledged_at: new Date().toISOString() }, emailRedirectTo: `${requirePilotEnv().appUrl}/auth/callback`
  }});
  if (error) fail(error.message);
  if (data.session) redirect("/account");
  redirect(`/login?message=${encodeURIComponent("Check your email and tap the confirmation link, then log in.")}`);
}

export async function logout() {
  const client = await createAuthClient();
  await client.auth.signOut();
  redirect("/");
}
