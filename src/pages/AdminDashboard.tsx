
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "@/services/authService";
import { fetchPrayerTimes } from "@/services/dataService";
import AdminNavbar from "@/components/admin/AdminNavbar";
import PrayerTimesTableEditor from "@/components/admin/PrayerTimesTableEditor";
import { PrayerTime, User } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    <div className="h-screen flex flex-col overflow-hidden bg-amber-50">
      <div className="pattern-overlay"></div>
      <AdminNavbar onLogout={handleLogout} />
      
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {currentUser && (
            <div className="mb-4 text-sm text-amber-700">
              Logged in as: {currentUser.email}
            </div>
          )}
          
          {/* Prayer Times Table */}
          <div className="w-full mb-6">
            <h2 className="text-2xl font-bold text-amber-800 mb-4">Prayer Times Management</h2>
            <PrayerTimesTableEditor />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminDashboard;
