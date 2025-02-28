
import { useState, useEffect } from "react";
import { DailyHadith } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, CalendarDays, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DailyHadithEditor = () => {
  const [hadiths, setHadiths] = useState<DailyHadith[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [savingHadithId, setSavingHadithId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  useEffect(() => {
    loadHadiths();
  }, [currentMonth]);
  
  const loadHadiths = async () => {
    setIsLoading(true);
    try {
      console.log(`Loading hadiths for month: ${currentMonth}`);
      const { data, error } = await supabase
        .from('daily_hadiths')
        .select('*')
        .eq('month', currentMonth)
        .order('day_of_month', { ascending: true });
      
      if (error) {
        console.error("Error fetching hadiths:", error);
        setDebugInfo(`Error: ${error.message}`);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log(`Found ${data?.length} hadiths for month ${currentMonth}:`, data);
      setHadiths(data || []);
      
      // Also check how many total hadiths we have
      const { data: allHadiths, error: allError } = await supabase
        .from('daily_hadiths')
        .select('*');
      
      if (!allError) {
        setDebugInfo(`Total hadiths in database: ${allHadiths?.length || 0}`);
      }
    } catch (error) {
      console.error("Error loading hadiths:", error);
      toast.error("Failed to load hadiths");
      setHadiths([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = event.target.value;
    console.log(`Changing month from ${currentMonth} to ${newMonth}`);
    setCurrentMonth(newMonth);
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
    
    console.log(`Adding new hadith for day ${day} in month ${currentMonth}:`, newHadith);
    setHadiths([...hadiths, newHadith]);
  };
  
  const handleSaveHadith = async (hadith: DailyHadith) => {
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
        day_of_month: Number(hadith.day_of_month),
        text: hadith.text.trim(),
        source: hadith.source.trim(),
        month: currentMonth // Always use the currently selected month
      };
      
      console.log("Preparing to save hadith:", hadithToSave);
      
      let result;
      
      // Check if this is a new hadith or an existing one
      if (hadith.id && hadith.id.startsWith('temp-')) {
        // New hadith - insert directly with supabase
        console.log("Inserting new hadith for month:", currentMonth);
        const { data, error } = await supabase
          .from('daily_hadiths')
          .insert(hadithToSave)
          .select()
          .single();
        
        if (error) {
          console.error("Supabase error inserting hadith:", error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        result = data;
      } else {
        // Existing hadith - update with supabase
        console.log("Updating existing hadith with ID:", hadith.id);
        const { data, error } = await supabase
          .from('daily_hadiths')
          .update(hadithToSave)
          .eq('id', hadith.id)
          .select()
          .single();
        
        if (error) {
          console.error("Supabase error updating hadith:", error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        result = data;
      }
      
      console.log("Save result:", result);
      
      // Update the hadiths array with the saved hadith
      if (result) {
        setHadiths(prev => 
          prev.map(h => h.id === hadith.id ? result as DailyHadith : h)
        );
        toast.success("Hadith saved successfully");
        
        // Reload the hadiths to ensure they're up to date
        await loadHadiths();
        
        // Verify the save
        const { data: verifyData, error: verifyError } = await supabase
          .from('daily_hadiths')
          .select('*')
          .eq('id', result.id)
          .single();
          
        if (verifyError) {
          console.error("Error verifying hadith save:", verifyError);
        } else if (verifyData) {
          console.log("Verified saved hadith:", verifyData);
          setDebugInfo(`Verified save: day=${verifyData.day_of_month}, month=${verifyData.month}`);
        }
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
  
  const handleDeleteHadith = async (hadith: DailyHadith) => {
    if (window.confirm("Are you sure you want to delete this hadith?")) {
      try {
        // If it's a temporary ID (not yet saved), just remove from state
        if (hadith.id && hadith.id.startsWith('temp-')) {
          setHadiths(prev => prev.filter(h => h.id !== hadith.id));
          toast.success("Hadith removed");
          return;
        }
        
        // Otherwise delete from database
        const { error } = await supabase
          .from('daily_hadiths')
          .delete()
          .eq('id', hadith.id);
        
        if (error) {
          console.error("Supabase error deleting hadith:", error);
          throw error;
        }
        
        setHadiths(prev => prev.filter(h => h.id !== hadith.id));
        toast.success("Hadith deleted successfully");
      } catch (error) {
        console.error("Error deleting hadith:", error);
        toast.error(`Failed to delete hadith: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
  
  // Get all days in the month for the dropdown
  const daysInMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };
  
  // Format the month name for display
  const formatMonthName = () => {
    return new Date(`${currentMonth}-01`).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-fade-in">
      <h3 className="text-xl font-bold text-amber-800 mb-4">Manage Daily Hadiths</h3>
      
      <div className="mb-4">
        <label htmlFor="month" className="block text-amber-800 mb-2 flex items-center">
          <CalendarDays className="mr-2" size={18} />
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
      
      {debugInfo && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <details>
            <summary className="flex items-center cursor-pointer text-amber-800">
              <Info size={16} className="mr-2" />
              Debug Information
            </summary>
            <p className="mt-2 text-sm text-amber-700">{debugInfo}</p>
          </details>
        </div>
      )}
      
      <div className="mb-4 flex justify-between items-center">
        <h4 className="text-lg font-semibold text-amber-800">
          {hadiths.length} Hadiths for {formatMonthName()}
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

export default DailyHadithEditor;
