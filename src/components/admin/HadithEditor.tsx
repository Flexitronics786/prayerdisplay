
import { useState } from "react";
import { Hadith } from "@/types";
import { updateHadith } from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HadithEditorProps {
  currentHadith: Hadith;
  onUpdate: (hadith: Hadith) => void;
}

const HadithEditor = ({ currentHadith, onUpdate }: HadithEditorProps) => {
  const [hadith, setHadith] = useState<Hadith>(currentHadith);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate months for the dropdown
  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    // Add options for the past month, current month, and next 6 months
    for (let i = -1; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthValue = date.toISOString().substring(0, 7); // YYYY-MM format
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value: monthValue, label: monthLabel });
    }
    
    return months;
  };

  const monthOptions = getMonthOptions();

  // Set current month as default if not already set
  if (!hadith.month) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    setHadith(prev => ({ ...prev, month: currentMonth }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      updateHadith(hadith);
      onUpdate(hadith);
      toast.success("Hadith updated successfully!");
    } catch (error) {
      toast.error("Failed to update hadith");
      console.error("Error updating hadith:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-fade-in">
      <h3 className="text-xl font-bold text-amber-800 mb-4">Edit Hadith of the Month</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="month" className="block text-amber-800 mb-2">
            Month
          </label>
          <Select 
            value={hadith.month || new Date().toISOString().substring(0, 7)}
            onValueChange={(value) => setHadith({ ...hadith, month: value })}
          >
            <SelectTrigger className="bg-amber-50 border-amber-200 text-amber-900">
              <SelectValue placeholder="Select a month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-amber-600 mt-1">
            The hadith will be displayed for the entire selected month
          </p>
        </div>
        
        <div>
          <label htmlFor="hadithText" className="block text-amber-800 mb-2">
            Hadith Text
          </label>
          <Textarea
            id="hadithText"
            value={hadith.text}
            onChange={(e) => setHadith({ ...hadith, text: e.target.value })}
            className="min-h-[100px] bg-amber-50 border-amber-200 text-amber-900"
            placeholder="Enter the hadith text..."
            required
          />
        </div>
        <div>
          <label htmlFor="source" className="block text-amber-800 mb-2">
            Source
          </label>
          <Input
            id="source"
            value={hadith.source}
            onChange={(e) => setHadith({ ...hadith, source: e.target.value })}
            className="bg-amber-50 border-amber-200 text-amber-900"
            placeholder="e.g., Sahih al-Bukhari"
            required
          />
        </div>
        <Button
          type="submit"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Update Hadith"}
        </Button>
      </form>
    </div>
  );
};

export default HadithEditor;
