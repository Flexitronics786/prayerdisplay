
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, fetchHadith, fetchPrayerTimes } from "@/services/dataService";
import AdminNavbar from "@/components/admin/AdminNavbar";
import HadithEditor from "@/components/admin/HadithEditor";
import PrayerTimesTableEditor from "@/components/admin/PrayerTimesTableEditor";
import { Hadith, PrayerTime } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("prayer-table");

  useEffect(() => {
    // Check if user is authenticated
    const user = getCurrentUser();
    if (!user || !user.isAdmin) {
      navigate("/admin");
      return;
    }

    // Load data
    const loadData = async () => {
      try {
        const currentPrayerTimes = await fetchPrayerTimes();
        const currentHadith = await fetchHadith(); // Await the Promise here
        
        setHadith(currentHadith); // Now it's the resolved value, not a Promise
        setPrayerTimes(currentPrayerTimes);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleHadithUpdate = (updatedHadith: Hadith) => {
    setHadith(updatedHadith);
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
      <div className="max-w-7xl mx-auto">
        <AdminNavbar />
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/10">
            <TabsTrigger 
              value="prayer-table" 
              className="data-[state=active]:bg-mosque-accent data-[state=active]:text-white"
            >
              Prayer Times Table
            </TabsTrigger>
            <TabsTrigger 
              value="hadith" 
              className="data-[state=active]:bg-mosque-accent data-[state=active]:text-white"
            >
              Edit Hadith
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="prayer-table" className="mt-0">
            <PrayerTimesTableEditor />
          </TabsContent>
          
          <TabsContent value="hadith" className="mt-0">
            <div className="grid md:grid-cols-1 gap-6">
              {hadith && (
                <HadithEditor currentHadith={hadith} onUpdate={handleHadithUpdate} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
