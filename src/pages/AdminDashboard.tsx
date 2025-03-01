
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "@/services/authService";
import { fetchPrayerTimes, deleteAllPrayerTimes } from "@/services/dataService";
import AdminNavbar from "@/components/admin/AdminNavbar";
import PrayerTimesTableEditor from "@/components/admin/PrayerTimesTableEditor";
import { PrayerTime, User } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [activeTab, setActiveTab] = useState("prayer-table");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Check if user is authenticated
        const user = await getCurrentUser();
        console.log("Current user:", user);
        
        if (!user || !user.isAdmin) {
          setAuthError("You must be logged in as an admin to access this page");
          toast.error("You must be logged in as an admin to access this page");
          setTimeout(() => {
            navigate("/admin");
          }, 2000);
          return;
        }
        
        setCurrentUser(user);
        
        // Load data
        try {
          const currentPrayerTimes = await fetchPrayerTimes();
          setPrayerTimes(currentPrayerTimes);
        } catch (dataError) {
          console.error("Error loading prayer times:", dataError);
          toast.error("Failed to load prayer times data");
          // Continue loading the dashboard even if data loading fails
        }
      } catch (error) {
        console.error("Error loading admin data:", error);
        setAuthError("Authentication error");
        toast.error("Authentication error. Please log in again.");
        setTimeout(() => {
          navigate("/admin");
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await logout();
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Logged out successfully");
      navigate("/admin");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("An error occurred during logout");
    }
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

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50">
        <div className="text-red-600 text-xl mb-4">{authError}</div>
        <Button onClick={() => navigate("/admin")}>Return to Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-amber-50">
      <div className="pattern-overlay"></div>
      <div className="max-w-7xl mx-auto">
        <AdminNavbar onLogout={handleLogout} />
        
        {currentUser && (
          <div className="mb-4 text-sm text-amber-700">
            Logged in as: {currentUser.email}
          </div>
        )}
        
        {/* Single tab for Prayer Times Table */}
        <div className="w-full mb-6">
          <h2 className="text-2xl font-bold text-amber-800 mb-4">Prayer Times Management</h2>
          
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
