
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, fetchHadith, fetchPrayerTimes } from "@/services/dataService";
import AdminNavbar from "@/components/admin/AdminNavbar";
import HadithEditor from "@/components/admin/HadithEditor";
import PrayerTimesEditor from "@/components/admin/PrayerTimesEditor";
import { Hadith, PrayerTime } from "@/types";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const user = getCurrentUser();
    if (!user || !user.isAdmin) {
      navigate("/admin");
      return;
    }

    // Load data
    try {
      const currentHadith = fetchHadith();
      const currentPrayerTimes = fetchPrayerTimes();
      
      setHadith(currentHadith);
      setPrayerTimes(currentPrayerTimes);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleHadithUpdate = (updatedHadith: Hadith) => {
    setHadith(updatedHadith);
  };

  const handlePrayerTimesUpdate = (updatedTimes: PrayerTime[]) => {
    setPrayerTimes(updatedTimes);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mosque-light text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      <div className="pattern-overlay"></div>
      <div className="max-w-4xl mx-auto">
        <AdminNavbar />
        
        <div className="grid md:grid-cols-1 gap-6">
          {hadith && (
            <HadithEditor currentHadith={hadith} onUpdate={handleHadithUpdate} />
          )}
          
          {prayerTimes.length > 0 && (
            <PrayerTimesEditor prayerTimes={prayerTimes} onUpdate={handlePrayerTimesUpdate} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
