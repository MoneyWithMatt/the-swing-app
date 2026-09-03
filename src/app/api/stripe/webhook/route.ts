import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { escapeEmailHtml, sendPilotEmail } from "@/lib/server/email";
import { getPilotEnv } from "@/lib/server/pilot-env";
import { supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthUserEmail } from "@/lib/server/supabase-auth";

export const runtime = "nodejs";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      payment_intent?: string;
      amount_total?: number;
      metadata?: { submission_id?: string };
    };
  };
};

type SubmissionNotification = {
  golfer_name: string;
  question: string;
  camera_angle: string;
  face_on_video_path?: string;
  coach_profile_id?: string;
};

type CoachNotification = { user_id: string; display_name: string };

function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!secret || !signature || !verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const submissionId = session.metadata?.submission_id;
    if (submissionId) {
      await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submissionId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({
          status: "submitted",
          payment_status: session.amount_total === 0 ? "discounted" : "authorized",
          stripe_payment_intent_id: session.payment_intent
        })
      });

      const env = getPilotEnv();
      if (env) {
        try {
          const submissions = await supabaseRest<SubmissionNotification[]>(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submissionId)}&select=golfer_name,question,camera_angle,face_on_video_path,coach_profile_id&limit=1`);
          const submission = submissions[0];
          const coaches = submission?.coach_profile_id ? await supabaseRest<CoachNotification[]>(`/rest/v1/coach_profiles?id=eq.${encodeURIComponent(submission.coach_profile_id)}&select=user_id,display_name&limit=1`) : [];
          const coach = coaches[0];
          const coachEmail = process.env.COACH_EMAIL || (coach ? await getAuthUserEmail(coach.user_id) : undefined);
          if (coachEmail && submission) {
            const angles = submission.face_on_video_path ? "Down the Line and Face On videos" : `${submission.camera_angle.replaceAll("_", " ")} video`;
            const golferName = escapeEmailHtml(submission.golfer_name);
            const coachName = escapeEmailHtml(coach?.display_name || "Coach");
            const question = escapeEmailHtml(submission.question);
            await sendPilotEmail({
              to: coachEmail,
              subject: `New swing submission from ${submission.golfer_name}`,
              html: `<p>Hi ${coachName},</p><p><strong>${golferName}</strong> has submitted a new ${angles}.</p><p><strong>Question:</strong> ${question}</p><p><a href="${env.appUrl}/coach/pilot">Open your coach queue</a></p>`,
              idempotencyKey: `submission-${submissionId}`
            });
          }
        } catch (notificationError) {
          // Stripe has already confirmed checkout. Log email failures without asking Stripe to repeat the payment event.
          console.error("Coach notification email failed.", notificationError);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
