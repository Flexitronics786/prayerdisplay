import express from 'express';
import cors from 'cors';
import { runSyncBot } from './bot.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Allow the main Prayer App to ping this
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'My-Masjid Sync Bot is awake' });
});

app.post('/sync', async (req, res) => {
    try {
        console.log("Sync requested via API...");
        const result = await runSyncBot();
        res.status(200).json(result);
    } catch (error) {
        console.error("Sync failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`My-Masjid Sync Bot Server listening on port ${PORT}`);
    console.log(`Ready to receive POST requests at http://localhost:${PORT}/sync`);
});
