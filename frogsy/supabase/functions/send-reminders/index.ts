import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize web-push
webpush.setVapidDetails(
  "mailto:you@example.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function handler(req: Request): Promise<Response> {
  try {
    // Fetch push subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) throw error;

    // Send notification to all subscriptions
    await Promise.all(
      (subscriptions || []).map((sub: any) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify({ title: "Frogsy Reminder 🐸", body: "Time to log your pain!" })
        )
      )
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
