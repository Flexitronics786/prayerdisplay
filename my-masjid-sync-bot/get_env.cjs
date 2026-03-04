const axios = require('axios');
const RENDER_API_KEY = 'rnd_cR2asuawgl2k0fH63N5cPqSWPtRv';
const SERVICE_ID = 'srv-d6k6r0ngi27c73cp38hg';

axios.get(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json'
    }
})
    .then(response => {
        console.log(JSON.stringify(response.data, null, 2));
    })
    .catch(error => {
        console.error("Error fetching env vars:", error.response ? error.response.data : error.message);
    });
