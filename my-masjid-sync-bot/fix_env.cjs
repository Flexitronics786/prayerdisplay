const axios = require('axios');
const RENDER_API_KEY = 'rnd_cR2asuawgl2k0fH63N5cPqSWPtRv';
const SERVICE_ID = 'srv-d6k6r0ngi27c73cp38hg';

const envVars = [
    { key: "VITE_SUPABASE_URL", value: "https://pxbvxsjadzqeqoyzxcbp.supabase.co" },
    { key: "VITE_SUPABASE_ANON_KEY", value: "sb_publishable_wsLTRPmRMJ2dacLv6BCtEQ_X8baVkwS" },
    { key: "MY_MASJID_EMAIL", value: "Samdani92@gmail.com" },
    { key: "MY_MASJID_PASSWORD", value: "Dura5@2022" }
];

axios.put(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, envVars, {
    headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
})
    .then(response => {
        console.log("Environment variables updated successfully!");
    })
    .catch(error => {
        console.error("Error updating env vars:", error.response ? error.response.data : error.message);
    });
