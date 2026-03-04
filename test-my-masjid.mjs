import puppeteer from 'puppeteer';

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Enable request interception to log API calls
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.url().includes('api') || request.method() === 'POST') {
            console.log(`[REQ] ${request.method()} ${request.url()}`);
            console.log(`[DATA] ${request.postData()}`);
        }
        request.continue();
    });

    console.log("Navigating to login page...");
    await page.goto('https://controlpanel.my-masjid.com/login', { waitUntil: 'networkidle2' });

    console.log("Filling in credentials...");
    // We'll need to figure out the exact selectors
    await page.screenshot({ path: 'login_page.png' });

    console.log("Saved screenshot of login page to login_page.png");

    await browser.close();
})();
