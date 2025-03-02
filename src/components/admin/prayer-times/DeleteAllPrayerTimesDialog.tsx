
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAllPrayerTimes } from "@/services/dataService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteAllPrayerTimesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteAllPrayerTimesDialog = ({ 
  isOpen, 
  onOpenChange 
}: DeleteAllPrayerTimesDialogProps) => {
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const queryClient = useQueryClient();

  const handleDeleteAllData = async () => {
    setIsDeletingAll(true);
    try {
      const result = await deleteAllPrayerTimes();
      if (result) {
        toast.success("All prayer times data has been deleted");
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
      } else {
        toast.error("Failed to delete all data");
      }
    } catch (error) {
      console.error("Error deleting all data:", error);
      toast.error("An error occurred while deleting data");
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete All Prayer Times Data</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete ALL prayer times data? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDeleteAllData}
            disabled={isDeletingAll}
          >
            {isDeletingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
