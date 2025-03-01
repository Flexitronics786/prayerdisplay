
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InfoIcon } from "lucide-react";

const HadithEditor = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  useState(() => {
    setIsLoading(false);
  });
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-fade-in">
      <h3 className="text-xl font-bold text-amber-800 mb-4">Edit Hadith</h3>
      
      <div className="p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
        <InfoIcon className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <h4 className="font-semibold text-amber-800">Feature Removed</h4>
          <p className="text-amber-700">
            The Hadith editing feature has been removed from the database. This admin panel is no longer functional.
          </p>
        </div>
      </div>
      
      <div className="py-8 text-center text-amber-800">
        This feature has been removed from the database.
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={() => toast.info("Feature has been removed")}
          variant="outline"
          className="text-amber-600 border-amber-300"
        >
          Feature Unavailable
        </Button>
      </div>
    </div>
  );
};

export default HadithEditor;
