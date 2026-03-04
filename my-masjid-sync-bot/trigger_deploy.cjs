const axios = require('axios');
const RENDER_API_KEY = 'rnd_cR2asuawgl2k0fH63N5cPqSWPtRv';
const SERVICE_ID = 'srv-d6k6r0ngi27c73cp38hg';

axios.post(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {}, {
    headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
})
    .then(response => {
        console.log("Triggered new deployment successfully!");
    })
    .catch(error => {
        console.error("Error triggering deploy:", error.response ? error.response.data : error.message);
    });
