import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AdminNavbarProps {
  onLogout: () => void;
}

const AdminNavbar = ({ onLogout }: AdminNavbarProps) => {
  const navigate = useNavigate();
  
  return (
    <nav className="bg-amber-900 text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center mb-2 sm:mb-0">
          <Link to="/" className="text-xl font-bold hover:text-amber-200 transition-colors">
            Masjid Dashboard
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Replace any other <a> tags with <Link> components */}
          <Link to="/admin/dashboard" className="hover:text-amber-200 transition-colors">
            Dashboard
          </Link>
          
          {/* Keep any other navigation items with correct Link components */}
          
          <button 
            onClick={onLogout}
            className="bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
