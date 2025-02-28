
import { useState } from "react";
import { login } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { user, error } = await login(email, password);
      
      if (user) {
        toast.success("Login successful!");
        navigate("/admin/dashboard");
      } else {
        toast.error(error || "Invalid credentials. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred during login.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl max-w-md w-full mx-auto shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-amber-800 mb-6">Admin Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-amber-700 mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-amber-50 border-amber-200 text-amber-900"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-amber-700 mb-2">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-amber-50 border-amber-200 text-amber-900"
            placeholder="••••••••"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
      <p className="mt-4 text-amber-700 text-sm text-center">
        Contact the system administrator to get access.
      </p>
    </div>
  );
};

export default LoginForm;
