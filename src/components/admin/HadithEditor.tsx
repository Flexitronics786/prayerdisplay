
import { useState } from "react";
import { Hadith } from "@/types";
import { updateHadith } from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface HadithEditorProps {
  currentHadith: Hadith;
  onUpdate: (hadith: Hadith) => void;
}

const HadithEditor = ({ currentHadith, onUpdate }: HadithEditorProps) => {
  const [hadith, setHadith] = useState<Hadith>(currentHadith);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <h3 className="text-xl font-bold text-white mb-4">Edit Hadith of the Day</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="hadithText" className="block text-mosque-light mb-2">
            Hadith Text
          </label>
          <Textarea
            id="hadithText"
            value={hadith.text}
            onChange={(e) => setHadith({ ...hadith, text: e.target.value })}
            className="min-h-[100px] bg-white/10 border-white/20 text-white"
            placeholder="Enter the hadith text..."
            required
          />
        </div>
        <div>
          <label htmlFor="source" className="block text-mosque-light mb-2">
            Source
          </label>
          <Input
            id="source"
            value={hadith.source}
            onChange={(e) => setHadith({ ...hadith, source: e.target.value })}
            className="bg-white/10 border-white/20 text-white"
            placeholder="e.g., Sahih al-Bukhari"
            required
          />
        </div>
        <Button
          type="submit"
          className="bg-mosque-accent hover:bg-mosque-accent/80 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Update Hadith"}
        </Button>
      </form>
    </div>
  );
};

export default HadithEditor;
