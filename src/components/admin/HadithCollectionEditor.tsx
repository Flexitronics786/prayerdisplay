import { useState, useEffect } from "react";
import { HadithCollectionItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, FileText, InfoIcon } from "lucide-react";
import { 
  fetchHadithCollection, 
  addHadithToCollection, 
  updateHadithInCollection, 
  deleteHadithFromCollection 
} from "@/services/dataService";

const HadithCollectionEditor = () => {
  const [hadiths, setHadiths] = useState<HadithCollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingHadithId, setSavingHadithId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  useEffect(() => {
    loadHadiths();
  }, []);
  
  const loadHadiths = async () => {
    setIsLoading(true);
    try {
      const hadithCollection = await fetchHadithCollection();
      console.log(`Found ${hadithCollection.length} hadiths in collection:`, hadithCollection);
      setHadiths(hadithCollection);
      
      setDebugInfo(`Total hadiths in collection: ${hadithCollection.length}`);
    } catch (error) {
      console.error("Error loading hadiths:", error);
      toast.error("Failed to load hadiths");
      setHadiths([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleHadithChange = (index: number, field: keyof HadithCollectionItem, value: string | boolean) => {
    const updatedHadiths = [...hadiths];
    updatedHadiths[index] = { ...updatedHadiths[index], [field]: value };
    setHadiths(updatedHadiths);
  };
  
  const handleAddHadith = () => {
    // Create a new hadith
    const newHadith: HadithCollectionItem = {
      id: `temp-${Date.now()}`,
      text: "",
      source: "",
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    console.log("Adding new hadith to collection:", newHadith);
    setHadiths([newHadith, ...hadiths]);
  };
  
  const handleSaveHadith = async (hadith: HadithCollectionItem) => {
    try {
      setSavingHadithId(hadith.id);
      
      // Validate hadith fields
      if (!hadith.text.trim()) {
        toast.error("Hadith text cannot be empty");
        setSavingHadithId(null);
        return;
      }
      
      if (!hadith.source.trim()) {
        toast.error("Hadith source cannot be empty");
        setSavingHadithId(null);
        return;
      }
      
      // Create a clean copy of the hadith for saving
      const hadithToSave = {
        text: hadith.text.trim(),
        source: hadith.source.trim(),
        is_active: hadith.is_active
      };
      
      console.log("Preparing to save hadith:", hadithToSave);
      
      let result;
      
      // Check if this is a new hadith or an existing one
      if (hadith.id && hadith.id.startsWith('temp-')) {
        // New hadith - insert
        console.log("Inserting new hadith to collection");
        result = await addHadithToCollection(hadithToSave);
      } else {
        // Existing hadith - update
        console.log("Updating existing hadith with ID:", hadith.id);
        result = await updateHadithInCollection(hadith.id, hadithToSave);
      }
      
      console.log("Save result:", result);
      
      // Update the hadiths array with the saved hadith
      if (result) {
        setHadiths(prev => 
          prev.map(h => h.id === hadith.id ? result as HadithCollectionItem : h)
        );
        toast.success("Hadith saved successfully");
        
        // Reload hadiths to ensure they're up to date
        await loadHadiths();
      } else {
        throw new Error("No data returned from database");
      }
    } catch (error) {
      console.error("Error saving hadith:", error);
      toast.error(`Failed to save hadith: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDebugInfo(`Save error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingHadithId(null);
    }
  };
  
  const handleDeleteHadith = async (hadith: HadithCollectionItem) => {
    if (window.confirm("Are you sure you want to delete this hadith?")) {
      try {
        // If it's a temporary ID (not yet saved), just remove from state
        if (hadith.id && hadith.id.startsWith('temp-')) {
          setHadiths(prev => prev.filter(h => h.id !== hadith.id));
          toast.success("Hadith removed");
          return;
        }
        
        // Otherwise delete from database
        const result = await deleteHadithFromCollection(hadith.id);
        
        if (result) {
          setHadiths(prev => prev.filter(h => h.id !== hadith.id));
          toast.success("Hadith deleted successfully");
        } else {
          throw new Error("Failed to delete hadith");
        }
      } catch (error) {
        console.error("Error deleting hadith:", error);
        toast.error(`Failed to delete hadith: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-fade-in">
      <h3 className="text-xl font-bold text-amber-800 mb-4">Manage Hadith Collection</h3>
      
      {debugInfo && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <details>
            <summary className="flex items-center cursor-pointer text-amber-800">
              <InfoIcon size={16} className="mr-2" />
              Debug Information
            </summary>
            <p className="mt-2 text-sm text-amber-700">{debugInfo}</p>
          </details>
        </div>
      )}
      
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-amber-600 mr-2" />
            <h4 className="text-lg font-semibold text-amber-800">
              {hadiths.length} Hadiths in Collection
            </h4>
          </div>
          <Button 
            onClick={handleAddHadith} 
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
          >
            <Plus size={16} />
            Add Hadith
          </Button>
        </div>
        <p className="text-sm text-amber-600 mt-1">
          These hadiths will cycle through each day. Only active hadiths will be displayed.
        </p>
      </div>
      
      {isLoading ? (
        <div className="py-8 text-center text-amber-800">Loading hadiths...</div>
      ) : hadiths.length === 0 ? (
        <div className="py-8 text-center text-amber-800">
          No hadiths found in collection. Use the "Add Hadith" button to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {hadiths.map((hadith, index) => (
            <div key={hadith.id} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`active-${index}`}
                      checked={hadith.is_active}
                      onCheckedChange={(checked) => handleHadithChange(index, 'is_active', checked)}
                    />
                    <Label htmlFor={`active-${index}`} className="text-amber-800">
                      {hadith.is_active ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteHadith(hadith)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              
              <div className="mb-3">
                <label htmlFor={`text-${index}`} className="block text-amber-800 mb-1">
                  Hadith Text
                </label>
                <Textarea
                  id={`text-${index}`}
                  value={hadith.text}
                  onChange={(e) => handleHadithChange(index, 'text', e.target.value)}
                  className="min-h-[100px] bg-white border-amber-200 text-amber-900"
                  placeholder="Enter the hadith text..."
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor={`source-${index}`} className="block text-amber-800 mb-1">
                  Source
                </label>
                <Input
                  id={`source-${index}`}
                  value={hadith.source}
                  onChange={(e) => handleHadithChange(index, 'source', e.target.value)}
                  className="bg-white border-amber-200 text-amber-900"
                  placeholder="e.g., Sahih al-Bukhari"
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={() => handleSaveHadith(hadith)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={savingHadithId === hadith.id}
                >
                  {savingHadithId === hadith.id ? 'Saving...' : 'Save Hadith'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HadithCollectionEditor;
