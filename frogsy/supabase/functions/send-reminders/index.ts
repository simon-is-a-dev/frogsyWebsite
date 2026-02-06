import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize web-push
webpush.setVapidDetails(
  "mailto:simonswart91@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function handler(req: Request): Promise<Response> {
  try {
    console.log("Starting to send push notifications...");
    
    // Get current time in UTC
    const now = new Date();
    const currentTimeUTC = now.toTimeString().substring(0, 5); // HH:MM format
    console.log(`Current UTC time: ${currentTimeUTC}`);
    
    // Fetch users who should receive notifications at this time
    const { data: preferences, error: prefError } = await supabase
      .from("user_notification_preferences")
      .select(`
        user_id,
        morning_time,
        afternoon_time,
        morning_enabled,
        afternoon_enabled
      `);

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    if (!preferences || preferences.length === 0) {
      console.log("No user preferences found");
      return new Response(JSON.stringify({ success: true, message: "No preferences found" }), { status: 200 });
    }

    // Filter users who should receive notifications at current time
    const eligibleUserIds = preferences
      .filter(pref => {
        const morningMatch = pref.morning_enabled && pref.morning_time?.substring(0, 5) === currentTimeUTC;
        const afternoonMatch = pref.afternoon_enabled && pref.afternoon_time?.substring(0, 5) === currentTimeUTC;
        return morningMatch || afternoonMatch;
      })
      .map(pref => pref.user_id);

    if (eligibleUserIds.length === 0) {
      console.log("No users scheduled for notifications at this time");
      return new Response(JSON.stringify({ success: true, message: "No users scheduled for this time" }), { status: 200 });
    }

    console.log(`Found ${eligibleUserIds.length} users scheduled for notifications at ${currentTimeUTC}`);

    // Fetch push subscriptions for eligible users
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", eligibleUserIds);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for eligible users");
      return new Response(JSON.stringify({ success: true, message: "No subscriptions found for eligible users" }), { status: 200 });
    }

    console.log(`Found ${subscriptions.length} subscriptions to notify`);

    // Send notification to all eligible subscriptions
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
              title: "Frogsy Reminder 🐸", 
              body: "Time to log your pain!" 
            })
          );
          console.log(`Successfully sent notification to user ${sub.user_id}`);
        } catch (error: any) {
          console.error(`Failed to send notification to user ${sub.user_id}:`, error);
          
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

    console.log(`Notification sending complete: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      time: currentTimeUTC,
      eligibleUsers: eligibleUserIds.length,
      total: subscriptions.length,
      successful,
      failed
    }), { status: 200 });
  } catch (err: any) {
    console.error("Error in send-reminders function:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
