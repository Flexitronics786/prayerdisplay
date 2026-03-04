import { createClient } from '@supabase/supabase-js';
import { createObjectCsvWriter } from 'csv-writer';
import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Ensure these environment variables are provided when deploying
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pxbvxsjadzqeqoyzxcbp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY; // Must be provided in .env
const MY_MASJID_EMAIL = process.env.MY_MASJID_EMAIL || 'Samdani92@gmail.com';
const MY_MASJID_PASSWORD = process.env.MY_MASJID_PASSWORD || 'Dura5@2022';

if (!SUPABASE_KEY) {
    console.warn("WARNING: Missing VITE_SUPABASE_ANON_KEY in environment variables. Data fetch will likely fail if RLS is enabled without providing anon key.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || '');

/**
 * Normalizes time string removing any leading zeros. e.g. '05:45' -> '5:45', '13:00' -> '1:00 PM'
/**
 * Normalizes time string to 24-hour HH:mm format required by My-Masjid.
 */
function formatTime(timeStr) {
    if (!timeStr) return '';
    let clean = timeStr.replace(/[\r\n\t]/g, '').trim();

    // Convert to HH:mm (24 hour)
    const parts = clean.split(':');
    if (parts.length >= 2) {
        let hour = parts[0].replace(/[^0-9]/g, '').padStart(2, '0');
        let min = parts[1].replace(/[^0-9]/g, '').padStart(2, '0');

        // Handle AM/PM if accidentally provided
        const upper = clean.toUpperCase();
        if (upper.includes('PM')) {
            let h = parseInt(hour, 10);
            if (h < 12) hour = (h + 12).toString().padStart(2, '0');
        } else if (upper.includes('AM')) {
            let h = parseInt(hour, 10);
            if (h === 12) hour = "00";
        }

        return `${hour}:${min}`;
    }
    return clean;
}

export async function runSyncBot() {
    console.log("--- Starting My-Masjid Sync Bot ---");

    // 1. Fetch Prayer Times from Supabase
    console.log("Fetching prayer times from Supabase database...");
    const { data: prayers, error } = await supabase
        .from('prayer_times')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error("Error fetching from Supabase:", error);
        return;
    }

    console.log(`Fetched ${prayers.length} prayer records.`);

    if (!prayers || prayers.length === 0) {
        console.warn("No prayer times found in Supabase. Aborting sync.");
        return { success: false, message: "No data in Supabase" };
    }

    // 2. Format Data exactly like My-Masjid CSV Template
    // Based on the downloaded template, fields are:
    // "Date","Fajr","Sunrise","Zuhr","Asr","Maghrib","Isha","Jumuah 1","Jumuah 2","Fajr Iqamah","Zuhr Iqamah","Asr Iqamah","Maghrib Iqamah","Isha Iqamah","Jumuah 1 Iqamah","Jumuah 2 Iqamah"

    // Generate exactly 366 rows (a leap year's worth of days)
    const year = 2024; // Use a leap year to get 366 days
    const daysInYear = 366;
    const records = [];

    // Create a map of "M-D" -> prayer data for easy matching (timezone-safe)
    const prayersByDate = {};
    if (prayers.length > 0) {
        prayers.forEach(p => {
            // p.date is usually "YYYY-MM-DD"
            const parts = p.date.split('-');
            if (parts.length === 3) {
                const m = parseInt(parts[1], 10);
                const d = parseInt(parts[2], 10);
                prayersByDate[`${m}-${d}`] = p;
            }
        });
    }

    // Default prayer fallback if DB is empty or missing days
    const defaultPrayer = prayers.length > 0 ? prayers[0] : {
        sunrise: '06:00:00',
        sehri_end: '05:00:00', fajr_jamat: '05:30:00',
        zuhr_start: '12:00:00', zuhr_jamat: '13:00:00',
        asr_start: '15:00:00', asr_jamat: '15:30:00',
        maghrib_iftar: '18:00:00',
        isha_start: '20:00:00', isha_first_jamat: '20:30:00'
    };

    for (let i = 1; i <= daysInYear; i++) {
        // Calculate month and day from the 'i' (day of year) in a leap year
        const dateObj = new Date(year, 0, i);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();

        // Exact match by Month-Day to prevent timezone shifting by 1 day
        let p = prayersByDate[`${month}-${day}`];
        if (!p) {
            p = defaultPrayer;
        }

        // Fallback logic for Adhan times if they are missing (use Iqamah time - 15 mins or just use Iqamah time)
        // My-Masjid seems to require Adhan times to not be empty.
        const fajr_adhan = p.sehri_end || p.fajr_jamat;
        const zuhr_adhan = p.zuhr_start || p.zuhr_jamat;
        const asr_adhan = p.asr_start || p.asr_jamat;
        const maghrib_adhan = p.maghrib_iftar;
        const isha_adhan = p.isha_start || p.isha_first_jamat;

        records.push({
            month: dateObj.getMonth() + 1,
            day: dateObj.getDate(),
            sehri: '',
            shouruq: formatTime(p.sunrise),
            fajr_adhan: formatTime(fajr_adhan),
            fajr2_adhan: '',
            fajr3_adhan: '',
            fajr_iqamah: formatTime(p.fajr_jamat),
            fajr2_iqamah: '',
            fajr3_iqamah: '',
            zawaal: '',
            dhuhr_adhan: formatTime(zuhr_adhan),
            dhuhr2_adhan: formatTime(zuhr_adhan), // Assuming Dhuhr2 maps to Jumuah
            dhuhr3_adhan: '',
            dhuhr_iqamah: formatTime(p.zuhr_jamat),
            dhuhr2_iqamah: formatTime(p.zuhr_jamat), // Assuming Dhuhr2 maps to Jumuah Jamat
            dhuhr3_iqamah: '',
            asr_adhan: formatTime(asr_adhan),
            asr2_adhan: '',
            asr3_adhan: '',
            asr_iqamah: formatTime(p.asr_jamat),
            asr2_iqamah: '',
            asr3_iqamah: '',
            maghrib_adhan: formatTime(maghrib_adhan),
            maghrib2_adhan: '',
            maghrib3_adhan: '',
            maghrib_iqamah: formatTime(maghrib_adhan), // Assuming Maghrib Adhan = Iqamah or close enough for the template if they don't have separate Iqamah field
            maghrib2_iqamah: '',
            maghrib3_iqamah: '',
            isha_adhan: formatTime(isha_adhan),
            isha2_adhan: '',
            isha3_adhan: '',
            isha_iqamah: formatTime(p.isha_first_jamat),
            isha2_iqamah: '',
            isha3_iqamah: ''
        });
    }

    const csvPath = path.resolve(process.cwd(), 'prayers_export.csv');
    console.log(`Writing ${records.length} records to ${csvPath}...`);

    const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: [
            { id: 'month', title: 'Month' },
            { id: 'day', title: 'Day' },
            { id: 'sehri', title: 'Sehri' },
            { id: 'shouruq', title: 'Shouruq' },
            { id: 'fajr_adhan', title: 'Fajr Adhan' },
            { id: 'fajr2_adhan', title: 'Fajr2 Adhan' },
            { id: 'fajr3_adhan', title: 'Fajr3 Adhan' },
            { id: 'fajr_iqamah', title: 'Fajr Iqamah' },
            { id: 'fajr2_iqamah', title: 'Fajr2 Iqamah' },
            { id: 'fajr3_iqamah', title: 'Fajr3 Iqamah' },
            { id: 'zawaal', title: 'Zawaal' },
            { id: 'dhuhr_adhan', title: 'Dhuhr Adhan' },
            { id: 'dhuhr2_adhan', title: 'Dhuhr2 Adhan' },
            { id: 'dhuhr3_adhan', title: 'Dhuhr3 Adhan' },
            { id: 'dhuhr_iqamah', title: 'Dhuhr Iqamah' },
            { id: 'dhuhr2_iqamah', title: 'Dhuhr2 Iqamah' },
            { id: 'dhuhr3_iqamah', title: 'Dhuhr3 Iqamah' },
            { id: 'asr_adhan', title: 'Asr Adhan' },
            { id: 'asr2_adhan', title: 'Asr2 Adhan' },
            { id: 'asr3_adhan', title: 'Asr3 Adhan' },
            { id: 'asr_iqamah', title: 'Asr Iqamah' },
            { id: 'asr2_iqamah', title: 'Asr2 Iqamah' },
            { id: 'asr3_iqamah', title: 'Asr3 Iqamah' },
            { id: 'maghrib_adhan', title: 'Maghrib Adhan' },
            { id: 'maghrib2_adhan', title: 'Maghrib2 Adhan' },
            { id: 'maghrib3_adhan', title: 'Maghrib3 Adhan' },
            { id: 'maghrib_iqamah', title: 'Maghrib Iqamah' },
            { id: 'maghrib2_iqamah', title: 'Maghrib2 Iqamah' },
            { id: 'maghrib3_iqamah', title: 'Maghrib3 Iqamah' },
            { id: 'isha_adhan', title: 'Isha Adhan' },
            { id: 'isha2_adhan', title: 'Isha2 Adhan' },
            { id: 'isha3_adhan', title: 'Isha3 Adhan' },
            { id: 'isha_iqamah', title: 'Isha Iqamah' },
            { id: 'isha2_iqamah', title: 'Isha2 Iqamah' },
            { id: 'isha3_iqamah', title: 'Isha3 Iqamah' }
        ]
    });

    await csvWriter.writeRecords(records);
    console.log("CSV generated successfully!");

    // 3. Launch Playwright to upload to My-Masjid
    console.log("Launching headless browser...");
    // Let's keep it headless: true for background, but save screenshots for debugging
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for any alerts or console errors on the my-masjid page
    page.on('dialog', async dialog => {
        console.log(`[PAGE DIALOG] ${dialog.type()}: ${dialog.message()}`);
        await dialog.dismiss();
    });
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[PAGE CONSOLE ERROR] ${msg.text()}`);
    });

    try {
        console.log("Navigating to My-Masjid login...");
        await page.goto('https://controlpanel.my-masjid.com/login');

        console.log("Authenticating...");
        await page.fill('input[type="email"]', MY_MASJID_EMAIL);
        await page.fill('input[type="password"]', MY_MASJID_PASSWORD);

        await Promise.all([
            page.waitForURL('**/dashboard**'),
            page.click('button[type="submit"]')
        ]);

        console.log("Login successful! Navigating to Salah Timings tab...");
        await page.goto('https://controlpanel.my-masjid.com/dashboard/salahtimings');

        // Wait for Angular to initialize
        await page.waitForTimeout(2000);

        console.log("Navigating to Upload / Download Timings tab...");
        // Click the specific tab for uploads (text "Upload / Download Timings")
        await page.click('text=Upload / Download Timings');
        await page.waitForTimeout(1000);

        console.log("Waiting for 'Upload CSV' button to be visible...");
        await page.waitForSelector('text=Upload CSV');

        console.log("Injecting CSV file...");
        // Click the button that opens the OS file picker
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('text=Upload CSV')
        ]);

        await fileChooser.setFiles(csvPath);

        console.log("Waiting for upload to process...");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.resolve(process.cwd(), 'debug_upload_1.png') });
        console.log("Taking debug screenshot: debug_upload_1.png");

        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.resolve(process.cwd(), 'debug_upload_2.png') });

        // Check if there are any toast messages or errors on screen
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.toLowerCase().includes('error') || pageText.toLowerCase().includes('fail') || pageText.toLowerCase().includes('invalid')) {
            console.error("Detected possible error on page after upload.");
        }

        console.log("--- Sync Script Finished Execution ---");
        return { success: true, message: "Sync script completed. Check debug screenshots." };
    } catch (error) {
        console.error("Error during browser automation:", error);
        await page.screenshot({ path: path.resolve(process.cwd(), 'debug_error.png') }).catch(() => { });
        throw error;
    } finally {
        await browser.close();
    }
}
