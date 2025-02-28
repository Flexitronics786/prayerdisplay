
import LoginForm from "@/components/admin/LoginForm";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/services/authService";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user && user.isAdmin) {
          navigate("/admin/dashboard");
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkUser();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="text-amber-800 text-xl animate-pulse">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pattern-overlay"></div>
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-mosque-light text-center mb-8">
          Prayer Times Admin
        </h1>
        <LoginForm />
      </div>
    </div>
  );
};

export default AdminLogin;
