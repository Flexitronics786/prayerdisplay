
import { useState } from "react";
import { login } from "@/services/dataService";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = login(email, password);
      
      if (success) {
        toast.success("Login successful!");
        navigate("/admin/dashboard");
      } else {
        toast.error("Invalid credentials. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred during login.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 rounded-xl max-w-md w-full mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Admin Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-mosque-light mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white/10 border-white/20 text-white"
            placeholder="admin@mosque.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-mosque-light mb-2">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white/10 border-white/20 text-white"
            placeholder="••••••••"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-mosque-accent hover:bg-mosque-accent/80 text-white"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
      <div className="mt-4 text-mosque-light/70 text-sm text-center">
        <p>Demo credentials:</p>
        <p>Email: admin@mosque.com</p>
        <p>Password: admin123</p>
      </div>
    </div>
  );
};

export default LoginForm;
