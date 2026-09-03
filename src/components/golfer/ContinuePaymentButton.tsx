"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export function ContinuePaymentButton({ submissionId, className = "" }: { submissionId: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function continuePayment() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId })
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout could not be opened.");
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be opened.");
      setLoading(false);
    }
  }

  return <div className={className}>
    <Button type="button" size="sm" className="w-full" disabled={loading} onClick={continuePayment}>
      <CreditCard size={16} aria-hidden />{loading ? "Opening Stripe..." : "Continue payment"}
    </Button>
    {error ? <p className="mt-2 text-xs font-bold text-clay">{error}</p> : null}
  </div>;
}
