import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, FileText, InfoIcon } from "lucide-react";

const HadithCollectionEditor = () => {
  const [hadiths, setHadiths] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-fade-in">
      <h3 className="text-xl font-bold text-amber-800 mb-4">Manage Hadith Collection</h3>
      
      <div className="py-8 text-center text-amber-800">
        The hadith collection feature has been removed from the database.
      </div>
    </div>
  );
};

export default HadithCollectionEditor;
