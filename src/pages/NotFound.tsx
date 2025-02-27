
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="pattern-overlay"></div>
      <div className="text-center glass-card p-8 rounded-xl animate-fade-in">
        <h1 className="text-4xl font-bold text-mosque-light mb-4">404</h1>
        <p className="text-xl text-white mb-6">Page not found</p>
        <Button 
          className="bg-mosque-accent hover:bg-mosque-accent/80 text-white"
          onClick={() => navigate("/")}
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
