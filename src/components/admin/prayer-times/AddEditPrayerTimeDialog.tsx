
import { useState } from "react";
import { Loader2, Plus, Save, Calendar, Clock } from "lucide-react";
import { addPrayerTimeEntry, updatePrayerTimeEntry } from "@/services/dataService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DetailedPrayerTime } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddEditPrayerTimeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  formData: Omit<DetailedPrayerTime, 'id' | 'created_at'>;
  setFormData: React.Dispatch<React.SetStateAction<Omit<DetailedPrayerTime, 'id' | 'created_at'>>>;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const AddEditPrayerTimeDialog = ({
  isOpen,
  onOpenChange,
  editingId,
  formData,
  setFormData,
  setEditingId
}: AddEditPrayerTimeDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const requiredFields = ['date', 'day', 'fajr_jamat', 'sunrise', 'zuhr_jamat', 'asr_jamat', 'maghrib_iftar', 'isha_first_jamat'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in the required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      if (editingId) {
        const result = await updatePrayerTimeEntry(editingId, formData);
        if (result) {
          toast.success("Prayer time updated successfully");
          onOpenChange(false);
          setEditingId(null);
          queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
        } else {
          toast.error("Failed to update prayer time");
        }
      } else {
        const result = await addPrayerTimeEntry(formData);
        if (result) {
          toast.success("Prayer time added successfully");
          onOpenChange(false);
          queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
        } else {
          toast.error("Failed to add prayer time");
        }
      }
    } catch (error) {
      console.error("Error submitting prayer time:", error);
      toast.error("An error occurred while saving the prayer time");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Prayer Time
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Prayer Time" : "Add New Prayer Time"}</DialogTitle>
          <DialogDescription>
            {editingId 
              ? "Update the prayer time details below." 
              : "Enter the prayer time details for a specific date."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date*</Label>
              <div className="relative">
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="day">Day*</Label>
              <Input
                id="day"
                name="day"
                value={formData.day}
                onChange={handleInputChange}
                placeholder="e.g. Monday"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sehri_end">Sehri End</Label>
              <div className="relative">
                <Input
                  id="sehri_end"
                  name="sehri_end"
                  type="time"
                  value={formData.sehri_end}
                  onChange={handleInputChange}
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fajr_jamat">Fajr Jamat*</Label>
              <div className="relative">
                <Input
                  id="fajr_jamat"
                  name="fajr_jamat"
                  type="time"
                  value={formData.fajr_jamat}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sunrise">Sunrise*</Label>
              <div className="relative">
                <Input
                  id="sunrise"
                  name="sunrise"
                  type="time"
                  value={formData.sunrise}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zuhr_start">Zuhr Start</Label>
              <div className="relative">
                <Input
                  id="zuhr_start"
                  name="zuhr_start"
                  type="time"
                  value={formData.zuhr_start}
                  onChange={handleInputChange}
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zuhr_jamat">Zuhr Jamat*</Label>
              <div className="relative">
                <Input
                  id="zuhr_jamat"
                  name="zuhr_jamat"
                  type="time"
                  value={formData.zuhr_jamat}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="asr_start">Asr Start</Label>
              <div className="relative">
                <Input
                  id="asr_start"
                  name="asr_start"
                  type="time"
                  value={formData.asr_start}
                  onChange={handleInputChange}
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asr_jamat">Asr Jamat*</Label>
              <div className="relative">
                <Input
                  id="asr_jamat"
                  name="asr_jamat"
                  type="time"
                  value={formData.asr_jamat}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maghrib_iftar">Maghrib/Iftar*</Label>
              <div className="relative">
                <Input
                  id="maghrib_iftar"
                  name="maghrib_iftar"
                  type="time"
                  value={formData.maghrib_iftar}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isha_start">Isha Start</Label>
              <div className="relative">
                <Input
                  id="isha_start"
                  name="isha_start"
                  type="time"
                  value={formData.isha_start}
                  onChange={handleInputChange}
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="isha_first_jamat">Isha First Jamat*</Label>
              <div className="relative">
                <Input
                  id="isha_first_jamat"
                  name="isha_first_jamat"
                  type="time"
                  value={formData.isha_first_jamat}
                  onChange={handleInputChange}
                  required
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="isha_second_jamat">Isha Second Jamat</Label>
            <div className="relative">
              <Input
                id="isha_second_jamat"
                name="isha_second_jamat"
                type="time"
                value={formData.isha_second_jamat}
                onChange={handleInputChange}
                className="pl-10"
              />
              <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              onOpenChange(false);
              setEditingId(null);
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingId ? "Update" : "Save"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
