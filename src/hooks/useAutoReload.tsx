import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAutoReload = () => {
    useEffect(() => {
        // 1. Setup Daily 3:00 AM Auto-Reload
        const setupDailyReload = () => {
            const now = new Date();
            const targetTime = new Date(now);
            targetTime.setHours(3, 0, 0, 0);

            // If it is already past 3:00 AM today, schedule for 3:00 AM tomorrow
            if (now.getTime() > targetTime.getTime()) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            const timeUntilReload = targetTime.getTime() - now.getTime();
            console.log(`Auto-reload scheduled in ${Math.round(timeUntilReload / 1000 / 60)} minutes (at 3:00 AM)`);

            const timerId = setTimeout(() => {
                console.log("Executing daily 3:00 AM auto-reload");
                window.location.reload();
            }, timeUntilReload);

            return timerId;
        };

        const dailyTimerId = setupDailyReload();

        // 2. Setup Supabase Remote Command Listener
        const commandSubscription = supabase
            .channel('app_commands')
            .on('broadcast', { event: 'force_reload' }, (payload) => {
                console.log("Received remote force_reload command:", payload);
                window.location.reload();
            })
            .subscribe((status) => {
                console.log("App commands channel status:", status);
            });

        // Cleanup on component unmount
        return () => {
            clearTimeout(dailyTimerId);
            supabase.removeChannel(commandSubscription);
        };
    }, []);
};
