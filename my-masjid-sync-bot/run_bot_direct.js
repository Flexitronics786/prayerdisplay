import { runSyncBot } from './bot.js';

runSyncBot()
    .then(() => console.log('Successfully completed.'))
    .catch((err) => console.error('Error:', err))
    .finally(() => process.exit(0));
