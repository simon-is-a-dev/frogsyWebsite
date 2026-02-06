import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Initialize Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Initialize web-push
webpush.setVapidDetails(
  "mailto:simonswart91@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

export async function handler(req: Request): Promise<Response> {
  try {
    console.log("Starting manual test of push notifications...");
    
    // Get URL parameters to optionally target specific user
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("user_id");
    
    // Fetch push subscriptions from Supabase
    let query = supabase.from("push_subscriptions").select("*");
    
    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }
    
    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found" + (targetUserId ? ` for user ${targetUserId}` : ""));
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No subscriptions found" + (targetUserId ? ` for user ${targetUserId}` : ""),
        targetUserId 
      }), { status: 200 });
    }

    console.log(`Found ${subscriptions.length} subscriptions to test`);

    // Send test notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            JSON.stringify({ 
              title: "🧪 Manual Test Notification", 
              body: "This is a manual test from Frogsy! Notifications are working!",
              tag: 'manual-test-notification',
              requireInteraction: true
            })
          );
          console.log(`Successfully sent test notification to user ${sub.user_id}`);
          return { userId: sub.user_id, success: true };
        } catch (error: any) {
          console.error(`Failed to send test notification to user ${sub.user_id}:`, error);
          
          // If subscription is no longer valid, remove it from database
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Removing invalid subscription for user ${sub.user_id}`);
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Manual test complete: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      type: 'manual_test',
      targetUserId,
      total: subscriptions.length,
      successful,
      failed,
      message: `Manual test sent to ${subscriptions.length} subscription(s)`
    }), { status: 200 });
  } catch (err: any) {
    console.error("Error in manual test function:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
