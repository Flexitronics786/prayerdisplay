import { supabase } from "@/integrations/supabase/client";

export interface JummahSettings {
    jamat1: string;
    jamat2: string;
}

const JUMMAH_SETTINGS_KEY = 'jummah_times';

const defaultJummahSettings: JummahSettings = {
    jamat1: '13:30',
    jamat2: ''
};

export const fetchJummahSettings = async (): Promise<JummahSettings> => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', JUMMAH_SETTINGS_KEY)
            .single();

        if (error || !data) {
            console.log('No jummah settings found in DB, using defaults or local storage');

            const local = localStorage.getItem(`settings_${JUMMAH_SETTINGS_KEY}`);
            if (local) {
                return JSON.parse(local) as JummahSettings;
            }

            return defaultJummahSettings;
        }

        // Save to local storage as fallback
        localStorage.setItem(`settings_${JUMMAH_SETTINGS_KEY}`, JSON.stringify(data.value));

        return data.value as unknown as JummahSettings;
    } catch (error) {
        console.error('Error fetching jummah settings:', error);

        // Fallback to local
        const local = localStorage.getItem(`settings_${JUMMAH_SETTINGS_KEY}`);
        if (local) {
            return JSON.parse(local) as JummahSettings;
        }

        return defaultJummahSettings;
    }
};

export const updateJummahSettings = async (settings: JummahSettings): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('settings')
            .upsert({
                key: JUMMAH_SETTINGS_KEY,
                value: settings as unknown as any
            });

        if (error) {
            console.error('Error updating jummah settings in DB:', error);
            throw error;
        }

        // Update local storage
        localStorage.setItem(`settings_${JUMMAH_SETTINGS_KEY}`, JSON.stringify(settings));

        // Broadcast setting update
        window.dispatchEvent(new StorageEvent('storage', {
            key: `settings_${JUMMAH_SETTINGS_KEY}`
        }));

        // Broadcast reload to all clients
        await supabase.channel('app_commands').send({
            type: 'broadcast',
            event: 'force_reload',
            payload: { time: new Date().toISOString() }
        });

        return true;
    } catch (error) {
        console.error('Error in updateJummahSettings:', error);
        return false;
    }
};
