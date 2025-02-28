
import { useState } from "react";
import { login, registerAdmin } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { user, error } = await registerAdmin(email, password);
      
      if (user) {
        toast.success("Registration successful! You can now log in.");
        setActiveTab("login");
      } else {
        toast.error(error || "Registration failed. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred during registration.");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl max-w-md w-full mx-auto shadow-lg animate-fade-in">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-amber-100">
          <TabsTrigger 
            value="login" 
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
          >
            Login
          </TabsTrigger>
          <TabsTrigger 
            value="register" 
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
          >
            Register Admin
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="login" className="mt-0">
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
            No admin account yet? Use the Register tab to create one.
          </p>
        </TabsContent>
        
        <TabsContent value="register" className="mt-0">
          <h2 className="text-2xl font-bold text-amber-800 mb-6">Register Admin</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-email" className="block text-amber-700 mb-2">
                Email
              </label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-amber-50 border-amber-200 text-amber-900"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-amber-700 mb-2">
                Password
              </label>
              <Input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-amber-50 border-amber-200 text-amber-900"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-amber-600 mt-1">Password must be at least 6 characters</p>
            </div>
            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Registering..." : "Register"}
            </Button>
          </form>
          <div className="mt-4 text-amber-700 text-sm text-center">
            <p>Note: Registration is only available if no admin exists yet.</p>
            <p>This is a security measure to prevent unauthorized admin creation.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoginForm;
