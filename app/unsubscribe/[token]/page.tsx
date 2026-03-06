import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;

  const supabase = createServiceClient();

  // Look up token
  const { data: unsub } = await supabase
    .from("unsubscribe_tokens")
    .select("customer_id, customers(name, marketing_unsubscribed)")
    .eq("token", token)
    .single();

  if (!unsub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">This unsubscribe link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (unsub as any).customers;
  const alreadyUnsubscribed = customer?.marketing_unsubscribed;

  if (!alreadyUnsubscribed) {
    // Mark as unsubscribed
    await supabase
      .from("customers")
      .update({ marketing_unsubscribed: true })
      .eq("id", unsub.customer_id);

    // Cancel queued recipients
    await supabase
      .from("campaign_recipients")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("customer_id", unsub.customer_id)
      .eq("status", "queued");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unsubscribed</h1>
        <p className="text-gray-600 mb-6">
          {customer?.name ? `${customer.name}, you` : "You"} have been unsubscribed from marketing
          emails from Genesis Refrigeration & HVAC.
        </p>
        <p className="text-sm text-gray-400">
          You will still receive transactional messages related to your service appointments and
          estimates.
        </p>
      </div>
    </div>
  );
}
