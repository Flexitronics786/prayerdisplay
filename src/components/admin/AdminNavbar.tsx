
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

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
          <Link to="/admin/dashboard" className="hover:text-amber-200 transition-colors">
            Dashboard
          </Link>
          
          <a 
            href="https://jamimasjidbilal.netlify.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded text-white transition-colors"
          >
            <span>View Main Display</span>
            <ExternalLink className="h-4 w-4" />
          </a>
          
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
