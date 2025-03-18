
// Re-export all service functions from the new modular files
// This maintains backward compatibility with existing code

// Re-export from cacheService
export { 
  clearPrayerTimesCache,
  isCacheStale,
  updateCacheTimestamp,
  savePrayerTimesToLocalStorage,
  saveDetailedPrayerTimesToLocalCache,
  getTodaysPrayerTimesFromCache,
  getAllPrayerTimesFromCache,
  PRAYER_TIMES_KEY
} from './cacheService';

// Re-export from hadithService
export {
  fetchHadith,
  getDefaultHadith
} from './hadithService';

// Re-export from prayerTimeService
export {
  fetchPrayerTimes,
  updatePrayerTimes,
  fetchAllPrayerTimes,
  addPrayerTimeEntry,
  updatePrayerTimeEntry,
  deletePrayerTimeEntry,
  deleteAllPrayerTimes
} from './prayerTimeService';

// Re-export from importService
export {
  importFromCSV,
  importPrayerTimesFromSheet
} from './importService';

// Re-export from prayerTimeUtils
export {
  defaultPrayerTimes,
  mapToDisplayFormat,
  markActivePrayer
} from './prayerTimeUtils';
