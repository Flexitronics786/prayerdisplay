
import { logout } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await logout();
    if (error) {
      toast.error(`Logout failed: ${error}`);
    } else {
      toast.success("Logged out successfully");
      navigate("/admin");
    }
  };

  const handleViewDisplay = () => {
    navigate("/");
  };

  return (
    <nav className="bg-white mb-6 py-4 px-6 rounded-xl flex items-center justify-between shadow-md">
      <div>
        <h2 className="text-xl font-bold text-amber-800">Prayer Times Admin</h2>
      </div>
      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-900"
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
