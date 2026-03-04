const axios = require('axios');
const RENDER_API_KEY = 'rnd_cR2asuawgl2k0fH63N5cPqSWPtRv';

axios.get('https://api.render.com/v1/owners', {
    headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json'
    }
})
    .then(response => {
        console.log("Owner ID:", response.data[0].owner.id);
    })
    .catch(error => {
        console.error("Error fetching owner ID");
    });
