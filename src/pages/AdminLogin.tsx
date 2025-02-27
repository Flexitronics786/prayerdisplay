
import LoginForm from "@/components/admin/LoginForm";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/services/dataService";

const AdminLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const user = getCurrentUser();
    if (user && user.isAdmin) {
      navigate("/admin/dashboard");
    }
  }, [navigate]);

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
