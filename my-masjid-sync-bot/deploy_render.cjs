const axios = require('axios');
require('dotenv').config();

const RENDER_API_KEY = 'rnd_cR2asuawgl2k0fH63N5cPqSWPtRv';

const payload = {
    type: "web_service",
    name: "my-masjid-sync-bot",
    ownerId: "tea-d6k6eqfgi27c73coqvmg",
    repo: "https://github.com/Flexitronics786/prayerdisplay",
    autoDeploy: "yes",
    branch: "main",
    rootDir: "my-masjid-sync-bot",
    serviceDetails: {
        env: "docker",
        plan: "free",
        region: "oregon",
        envSpecificDetails: {
            dockerCommand: "",
            dockerfilePath: "./Dockerfile",
            dockerContext: "."
        },
        envVars: [
            { key: "VITE_SUPABASE_URL", value: process.env.VITE_SUPABASE_URL },
            { key: "VITE_SUPABASE_ANON_KEY", value: process.env.VITE_SUPABASE_ANON_KEY },
            { key: "MY_MASJID_EMAIL", value: process.env.MY_MASJID_EMAIL || "Samdani92@gmail.com" },
            { key: "MY_MASJID_PASSWORD", value: process.env.MY_MASJID_PASSWORD || "Dura5@2022" }
        ]
    }
};

axios.post('https://api.render.com/v1/services', payload, {
    headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
})
    .then(response => {
        console.log("Service created successfully!");
        console.log("Dashboard URL:\n", response.data.service.dashboardUrl);
        console.log("------------------------");
        console.log("Bot Service URL:\n", response.data.service.serviceDetails.url);
    })
    .catch(error => {
        console.error("Error creating service:");
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    });
