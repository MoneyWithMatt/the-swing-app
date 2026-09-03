import { NextResponse } from "next/server";
import { getPilotEnv } from "@/lib/server/pilot-env";
import { createCheckoutSession } from "@/lib/server/stripe-rest";
import { supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

type PilotSubmission = {
  id: string;
  public_token: string;
  golfer_email: string;
  payment_status: string;
  user_id?: string;
};

export async function POST(request: Request) {
  const env = getPilotEnv();
  if (!env) {
    return NextResponse.json({ error: "Pilot backend is not configured." }, { status: 503 });
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
    const { submissionId } = (await request.json()) as { submissionId?: string };
    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required." }, { status: 400 });
    }

    const submissions = await supabaseRest<PilotSubmission[]>(
      `/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submissionId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,public_token,golfer_email,payment_status,user_id&limit=1`
    );
    const submission = submissions[0];
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }
    if (!new Set(["not_started", "checkout_created"]).has(submission.payment_status)) {
      return NextResponse.json({ error: "This submission has already been paid for." }, { status: 409 });
    }

    const session = await createCheckoutSession({
      submissionId: submission.id,
      publicToken: submission.public_token,
      email: submission.golfer_email,
      appUrl: env.appUrl
    });

    await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        stripe_checkout_session_id: session.id,
        payment_status: "checkout_created"
      })
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not be started." }, { status: 500 });
  }
}
