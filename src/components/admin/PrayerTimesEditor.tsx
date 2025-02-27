
import { useState } from "react";
import { PrayerTime } from "@/types";
import { updatePrayerTimes } from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PrayerTimesEditorProps {
  prayerTimes: PrayerTime[];
  onUpdate: (prayerTimes: PrayerTime[]) => void;
}

const PrayerTimesEditor = ({ prayerTimes, onUpdate }: PrayerTimesEditorProps) => {
  const [times, setTimes] = useState<PrayerTime[]>(
    prayerTimes.map(({ id, name, time }) => ({ id, name, time }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTimeChange = (id: string, newTime: string) => {
    setTimes(
      times.map((prayer) => 
        prayer.id === id ? { ...prayer, time: newTime } : prayer
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate times (simple validation)
      for (const prayer of times) {
        if (!/^\d{2}:\d{2}$/.test(prayer.time)) {
          throw new Error(`Invalid time format for ${prayer.name}. Use HH:MM format (24-hour).`);
        }
      }

      updatePrayerTimes(times);
      onUpdate(times);
      toast.success("Prayer times updated successfully!");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update prayer times");
      }
      console.error("Error updating prayer times:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <h3 className="text-xl font-bold text-white mb-4">Edit Prayer Times</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4">
          {times.map((prayer) => (
            <div key={prayer.id} className="flex items-center gap-4">
              <label htmlFor={`prayer-${prayer.id}`} className="w-24 text-mosque-light">
                {prayer.name}
              </label>
              <Input
                id={`prayer-${prayer.id}`}
                type="text"
                value={prayer.time}
                onChange={(e) => handleTimeChange(prayer.id, e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                placeholder="HH:MM"
                pattern="\d{2}:\d{2}"
                title="Enter time in 24-hour format (HH:MM)"
                required
              />
            </div>
          ))}
        </div>
        <p className="text-mosque-light/70 text-sm">
          Enter times in 24-hour format (e.g., 05:30, 17:45)
        </p>
        <Button
          type="submit"
          className="bg-mosque-accent hover:bg-mosque-accent/80 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Update Prayer Times"}
        </Button>
      </form>
    </div>
  );
};

export default PrayerTimesEditor;
