// index.ts - Send Reminders Edge Function (Deno)

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
    console.log("Starting to send push notifications...");
    
    // Get current time in SAST (South Africa Time - UTC+2)
    const now = new Date();
    const sastTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
    const pad = (n: number) => n.toString().padStart(2, "0");
    const currentTimeSAST = `${pad(sastTime.getHours())}:${pad(sastTime.getMinutes())}`; // HH:MM format
    console.log(`Current SAST time: ${currentTimeSAST}`);
    
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
    const eligibleUserIds = (preferences as any[])
      .filter(pref => {
        const morningMatch = pref.morning_enabled && pref.morning_time?.substring(0, 5) === currentTimeSAST;
        const afternoonMatch = pref.afternoon_enabled && pref.afternoon_time?.substring(0, 5) === currentTimeSAST;
        return morningMatch || afternoonMatch;
      })
      .map(pref => pref.user_id);

    if (eligibleUserIds.length === 0) {
      console.log(`No users scheduled for notifications at ${currentTimeSAST} SAST`);
      return new Response(JSON.stringify({ success: true, message: "No users scheduled for this time" }), { status: 200 });
    }

    console.log(`Found ${eligibleUserIds.length} users scheduled for notifications at ${currentTimeSAST} SAST`);

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
      (subscriptions as any[]).map(async (sub: any) => {
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
          return { user_id: sub.user_id, status: "fulfilled" };
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
      totalSubscriptions: (subscriptions as any[]).length,
      successful,
      failed
    }), { status: 200 });
  } catch (err: any) {
    console.error("Error in send-reminders function:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// Serve the function
Deno.serve(handler);