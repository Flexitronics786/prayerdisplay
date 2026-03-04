import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push@3.6.7";

interface PushPayload {
    title: string;
    body: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        "mailto:admin@masjidbilal.com",
        vapidPublicKey,
        vapidPrivateKey
    );
} else {
    console.warn("VAPID keys are missing! Push notifications will fail.");
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Get local UK time (since mosque is in Dundee UK)
function getUKTime() {
    const now = new Date();
    // Use Intl.DateTimeFormat to get UK time specifically
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const dateObj: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            dateObj[part.type] = part.value;
        }
    }

    // YYYY-MM-DD
    const dateStr = `${dateObj.year}-${dateObj.month}-${dateObj.day}`;
    // HH:MM
    const timeStr = `${dateObj.hour}:${dateObj.minute}`;

    return { dateStr, timeStr, now: new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' })) };
}

// Helper to add minutes to HH:MM format
function addMinutes(timeStr: string, minutes: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let isManualTest = false;
        let manualPayload: PushPayload | null = null;

        try {
            const reqData = await req.json();
            if (reqData && reqData.title && reqData.body) {
                isManualTest = true;
                manualPayload = reqData;
            }
        } catch {
            // Not a JSON request (e.g., cron trigger), proceed with automated logic
        }

        let notificationsToSend: PushPayload[] = [];

        if (isManualTest && manualPayload) {
            notificationsToSend.push(manualPayload);
        } else {
            // AUTOMATED CRON LOGIC
            const uk = getUKTime();
            console.log(`Checking prayers for date: ${uk.dateStr}, time: ${uk.timeStr}`);

            // 1. Fetch today's prayer times
            const { data: prayers, error: prayerError } = await supabase
                .from('prayer_times')
                .select('*')
                .eq('date', uk.dateStr)
                .single();

            if (prayerError || !prayers) {
                console.log("No prayer times found for today in Supabase.");
                return new Response(JSON.stringify({ message: "No prayer times to process today" }), { headers: corsHeaders });
            }

            // Also check jummah settings for Friday
            const isFriday = uk.now.getDay() === 5;
            let jummahTime = null;
            if (isFriday) {
                const { data: settings } = await supabase.from('settings').select('value').eq('key', 'jummah_settings').single();
                if (settings?.value) {
                    const jSet = settings.value as any;
                    jummahTime = jSet.jamat1 || null;
                } else if (prayers.jummah_jamat_1) {
                    jummahTime = prayers.jummah_jamat_1;
                } else if (prayers.zuhr_jamat) {
                    jummahTime = prayers.zuhr_jamat;
                }
            }

            // We want to notify exactly AT the start time AND exactly AT the Jamat time
            const currentTime = uk.timeStr;

            // Helper to check and add notifications
            const checkPrayer = (name: string, startTime: string | null, jamatTime: string | null, hasSeparateJamat: boolean = true) => {
                if (startTime) {
                    const startHHMM = startTime.substring(0, 5);
                    if (startHHMM === currentTime) {
                        notificationsToSend.push({
                            title: `🕌 ${name} Time`,
                            body: `${name} time has started.`
                        });
                    }
                }

                if (hasSeparateJamat && jamatTime) {
                    const jamatHHMM = jamatTime.substring(0, 5);
                    if (jamatHHMM === currentTime) {
                        // Don't send duplicate if start and jamat are the exact same time
                        if (jamatHHMM !== startTime?.substring(0, 5)) {
                            notificationsToSend.push({
                                title: `🕌 ${name} Jamat`,
                                body: `Jamat for ${name} is starting now.`
                            });
                        }
                    }
                }
            };

            checkPrayer("Fajr", prayers.fajr_start, prayers.fajr_jamat);

            if (isFriday && jummahTime) {
                // Jummah doesn't really have a strict "start" in the same way as Zuhr from the DB, but Zuhr start is the effectively the same
                checkPrayer("Jummah", prayers.zuhr_start, jummahTime);
            } else {
                checkPrayer("Zuhr", prayers.zuhr_start, prayers.zuhr_jamat);
            }

            checkPrayer("Asr", prayers.asr_start, prayers.asr_jamat);
            // Maghrib has no separate jamat, it effectively starts and has jamat at the same time
            checkPrayer("Maghrib", prayers.maghrib_start, null, false);
            checkPrayer("Isha", prayers.isha_start, prayers.isha_first_jamat || prayers.isha_start);
        }

        if (notificationsToSend.length === 0) {
            console.log("No prayers starting right now. Doing nothing.");
            return new Response(JSON.stringify({ message: "No notifications needed right now" }), { headers: corsHeaders });
        }

        // Fetch all active subscriptions
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("*");

        if (error) throw error;
        if (!subscriptions || subscriptions.length === 0) {
            console.log("No active push subscriptions found.");
            return new Response(
                JSON.stringify({ message: "No active subscriptions found" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let sentCount = 0;
        let removedCount = 0;

        for (const payload of notificationsToSend) {
            console.log(`Sending push to ${subscriptions.length} devices for ${payload.title}...`);

            const sendPromises = subscriptions.map((sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        auth: sub.auth,
                        p256dh: sub.p256dh,
                    }
                };

                return webpush
                    .sendNotification(pushSubscription, JSON.stringify(payload))
                    .then(() => { sentCount++; })
                    .catch(async (err) => {
                        if (err.statusCode === 404 || err.statusCode === 410) {
                            console.log("Subscription expired or invalid, removing from DB:", sub.endpoint);
                            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                            removedCount++;
                        } else {
                            console.error("Push failed:", err);
                        }
                    });
            });

            await Promise.all(sendPromises);
        }

        return new Response(
            JSON.stringify({
                message: "Push notifications processed successfully",
                sent: sentCount,
                removed: removedCount
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Critical error:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
