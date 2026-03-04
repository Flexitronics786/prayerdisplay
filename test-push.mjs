import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pxbvxsjadzqeqoyzxcbp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wsLTRPmRMJ2dacLv6BCtEQ_X8baVkwS";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testPush() {
    console.log("Invoking edge function...");
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
            __debug: true
        }
    });

    if (error) {
        console.error("Error invoking function:", error);
    } else {
        console.dir(data, { depth: null });
    }
}

testPush();
