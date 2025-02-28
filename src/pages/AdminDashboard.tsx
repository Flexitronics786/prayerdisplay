
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/services/authService";
import { fetchHadith, fetchPrayerTimes, deleteAllPrayerTimes } from "@/services/dataService";
import AdminNavbar from "@/components/admin/AdminNavbar";
import HadithEditor from "@/components/admin/HadithEditor";
import DailyHadithEditor from "@/components/admin/DailyHadithEditor";
import PrayerTimesTableEditor from "@/components/admin/PrayerTimesTableEditor";
import { Hadith, PrayerTime, User } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [activeTab, setActiveTab] = useState("prayer-table");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      // Check if user is authenticated
      try {
        const user = await getCurrentUser();
        if (!user || !user.isAdmin) {
          toast.error("You must be logged in as an admin to access this page");
          navigate("/admin");
          return;
        }
        
        setCurrentUser(user);
        
        // Load data
        const currentPrayerTimes = await fetchPrayerTimes();
        const currentHadith = await fetchHadith();
        
        setPrayerTimes(currentPrayerTimes);
        setHadith(currentHadith);
      } catch (error) {
        console.error("Error loading admin data:", error);
        toast.error("Failed to load admin data");
        navigate("/admin");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleHadithUpdate = (updatedHadith: Hadith) => {
    setHadith(updatedHadith);
  };

  const handleDeleteAllData = async () => {
    if (window.confirm("Are you sure you want to delete ALL prayer times data? This action cannot be undone.")) {
      setIsDeletingData(true);
      try {
        const result = await deleteAllPrayerTimes();
        if (result) {
          toast.success("All prayer times data has been deleted");
          // Refresh any relevant queries
          queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
          // Force a refresh of the component
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          toast.error("Failed to delete all data");
        }
      } catch (error) {
        console.error("Error deleting all data:", error);
        toast.error("An error occurred while deleting data");
      } finally {
        setIsDeletingData(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-amber-800 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-amber-50">
      <div className="pattern-overlay"></div>
      <div className="max-w-7xl mx-auto">
        <AdminNavbar />
        
        {currentUser && (
          <div className="mb-4 text-sm text-amber-700">
            Logged in as: {currentUser.email}
          </div>
        )}
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-amber-100">
            <TabsTrigger 
              value="prayer-table" 
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              Prayer Times Table
            </TabsTrigger>
            <TabsTrigger 
              value="daily-hadith" 
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              Daily Hadiths
            </TabsTrigger>
            <TabsTrigger 
              value="hadith" 
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              Monthly Hadith
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="prayer-table" className="mt-0">
            <div className="flex justify-end mb-4">
              <Button 
                variant="destructive"
                onClick={handleDeleteAllData}
                disabled={isDeletingData}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingData ? "Deleting..." : "Delete All Data"}
              </Button>
            </div>
            <PrayerTimesTableEditor />
          </TabsContent>
          
          <TabsContent value="daily-hadith" className="mt-0">
            <DailyHadithEditor />
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
