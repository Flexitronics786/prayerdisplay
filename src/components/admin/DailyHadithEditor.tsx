
import { useState, useEffect } from "react";
import { DailyHadith } from "@/types";
import { 
  fetchDailyHadithsForMonth, 
  saveDailyHadith, 
  deleteDailyHadith 
} from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const DailyHadithEditor = () => {
  const [hadiths, setHadiths] = useState<DailyHadith[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  
  useEffect(() => {
    loadHadiths();
  }, [currentMonth]);
  
  const loadHadiths = async () => {
    setIsLoading(true);
    try {
      const monthHadiths = await fetchDailyHadithsForMonth(currentMonth);
      setHadiths(monthHadiths);
    } catch (error) {
      console.error("Error loading hadiths:", error);
      toast.error("Failed to load hadiths");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentMonth(event.target.value);
  };
  
  const handleHadithChange = (index: number, field: keyof DailyHadith, value: string | number) => {
    const updatedHadiths = [...hadiths];
    updatedHadiths[index] = { ...updatedHadiths[index], [field]: value };
    setHadiths(updatedHadiths);
  };
  
  const handleAddHadith = () => {
    // Find the first available day
    const usedDays = new Set(hadiths.map(h => h.day_of_month));
    let day = 1;
    while (usedDays.has(day) && day <= 31) {
      day++;
    }
    
    if (day > 31) {
      toast.error("All days of the month already have hadiths assigned");
      return;
    }
    
    const newHadith: DailyHadith = {
      id: `temp-${Date.now()}`,
      day_of_month: day,
      text: "",
      source: "",
      month: currentMonth
    };
    
    setHadiths([...hadiths, newHadith]);
  };
  
  const handleSaveHadith = async (hadith: DailyHadith) => {
    try {
      const savedHadith = await saveDailyHadith(hadith);
      
      // Update the hadiths array with the saved hadith
      setHadiths(hadiths.map(h => h.id === hadith.id ? savedHadith : h));
      
      toast.success("Hadith saved successfully");
    } catch (error) {
      console.error("Error saving hadith:", error);
      toast.error("Failed to save hadith");
    }
  };
  
  const handleDeleteHadith = async (hadith: DailyHadith) => {
    if (window.confirm("Are you sure you want to delete this hadith?")) {
      try {
        await deleteDailyHadith(hadith.id);
        setHadiths(hadiths.filter(h => h.id !== hadith.id));
        toast.success("Hadith deleted successfully");
      } catch (error) {
        console.error("Error deleting hadith:", error);
        toast.error("Failed to delete hadith");
      }
    }
  };
  
  // Get all days in the month for the dropdown
  const daysInMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-fade-in">
      <h3 className="text-xl font-bold text-amber-800 mb-4">Manage Daily Hadiths</h3>
      
      <div className="mb-6">
        <label htmlFor="month" className="block text-amber-800 mb-2">
          Month
        </label>
        <Input
          id="month"
          type="month"
          value={currentMonth}
          onChange={handleMonthChange}
          className="bg-amber-50 border-amber-200 text-amber-900"
        />
        <p className="text-sm text-amber-600 mt-1">
          Select a month to manage its daily hadiths
        </p>
      </div>
      
      <div className="mb-4 flex justify-between items-center">
        <h4 className="text-lg font-semibold text-amber-800">
          {hadiths.length} Hadiths for {new Date(`${currentMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        <Button 
          onClick={handleAddHadith} 
          className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
        >
          <Plus size={16} />
          Add Hadith
        </Button>
      </div>
      
      {isLoading ? (
        <div className="py-8 text-center text-amber-800">Loading hadiths...</div>
      ) : hadiths.length === 0 ? (
        <div className="py-8 text-center text-amber-800">
          No hadiths found for this month. Use the "Add Hadith" button to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {hadiths.sort((a, b) => a.day_of_month - b.day_of_month).map((hadith, index) => (
            <div key={hadith.id} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <label htmlFor={`day-${index}`} className="text-amber-800 mr-2">
                    Day:
                  </label>
                  <select
                    id={`day-${index}`}
                    value={hadith.day_of_month}
                    onChange={(e) => handleHadithChange(index, 'day_of_month', parseInt(e.target.value))}
                    className="border border-amber-200 rounded bg-white text-amber-900 px-2 py-1"
                  >
                    {Array.from({ length: daysInMonth() }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
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
                >
                  Save Hadith
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyHadithEditor;
