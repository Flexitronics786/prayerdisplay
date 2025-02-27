
import { logout } from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/admin");
  };

  const handleViewDisplay = () => {
    navigate("/");
  };

  return (
    <nav className="glass-card mb-6 py-4 px-6 rounded-xl flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-mosque-light">Prayer Times Admin</h2>
      </div>
      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          className="border-mosque-light/30 text-mosque-light hover:bg-mosque-accent/20 hover:text-white"
          onClick={handleViewDisplay}
        >
          View Display
        </Button>
        <Button 
          variant="destructive"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </nav>
  );
};

export default AdminNavbar;
