import { NextResponse } from "next/server";
import { COACH_COOKIE, coachKeyDigest } from "@/lib/server/coach-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const accessKey = String(form.get("accessKey") || "");
  const expected = process.env.COACH_ACCESS_KEY;
  const destination = new URL("/coach/pilot", request.url);

  if (!expected || accessKey !== expected) {
    destination.searchParams.set("error", "1");
    return NextResponse.redirect(destination, 303);
  }

  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(COACH_COOKIE, coachKeyDigest(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/"
  });
  return response;
}
