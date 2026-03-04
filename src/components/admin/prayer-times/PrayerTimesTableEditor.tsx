
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllPrayerTimes, cleanupPrayerTimes } from "@/services/dataService";
import { Loader2, Plus, Trash, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImportPrayerTimesDialog } from "./ImportPrayerTimesDialog";
import { AddEditPrayerTimeDialog } from "./AddEditPrayerTimeDialog";
import { PrayerTimesTable } from "./PrayerTimesTable";
import { DetailedPrayerTime } from "@/types";
import { DeleteAllPrayerTimesDialog } from "./DeleteAllPrayerTimesDialog";

const PrayerTimesTableEditor = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  // formData is only used for adding new rows now (editing is inline)
  const [formData, setFormData] = useState<Omit<DetailedPrayerTime, 'id' | 'created_at'>>({
    date: new Date().toISOString().split('T')[0],
    day: '',
    sehri_end: '',
    fajr_jamat: '',
    sunrise: '',
    zuhr_start: '',
    zuhr_jamat: '',
    asr_start: '',
    asr_jamat: '',
    maghrib_iftar: '',
    isha_start: '',
    isha_first_jamat: '',
    isha_second_jamat: ''
  });

  const {
    data: prayerTimes = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['prayerTimes'],
    queryFn: fetchAllPrayerTimes,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'local-prayer-times') {
        queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  useEffect(() => {
    if (!isAddDialogOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        day: '',
        sehri_end: '',
        fajr_jamat: '',
        sunrise: '',
        zuhr_start: '',
        zuhr_jamat: '',
        asr_start: '',
        asr_jamat: '',
        maghrib_iftar: '',
        isha_start: '',
        isha_first_jamat: '',
        isha_second_jamat: ''
      });
    }
  }, [isAddDialogOpen]);

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await cleanupPrayerTimes();
      if (result.success) {
        toast.success(`Cleanup complete. Removed ${result.deletedCount} past/duplicate entries.`);
        queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
      } else {
        toast.error(result.error || "Failed to clean up database");
      }
    } catch (error) {
      toast.error("An error occurred during cleanup");
    } finally {
      setIsCleaning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p>Error loading prayer times: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['prayerTimes'] })}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold text-amber-800">Prayer Times Table</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-amber-200 hover:bg-amber-50 text-amber-700 hover:text-amber-800"
            onClick={handleCleanup}
            disabled={isCleaning}
          >
            {isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Clean Up Data
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
            onClick={() => setIsDeleteAllDialogOpen(true)}
          >
            <Trash className="h-4 w-4" />
            Delete All Data
          </Button>

          <DeleteAllPrayerTimesDialog
            isOpen={isDeleteAllDialogOpen}
            onOpenChange={setIsDeleteAllDialogOpen}
          />

          <Button
            variant="default"
            className="flex items-center gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Prayer Time
          </Button>

          <ImportPrayerTimesDialog
            isOpen={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          />

          {/* Add-only dialog (editing is now done inline in the table) */}
          <AddEditPrayerTimeDialog
            isOpen={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            editingId={null}
            formData={formData}
            setFormData={setFormData}
            setEditingId={() => { }}
          />
        </div>
      </div>

      {/* Table supports inline editing — click ✏️ on any row */}
      <PrayerTimesTable
        prayerTimes={prayerTimes}
        onEdit={() => { }} // no-op: editing is now inline
      />

      <div className="text-xs text-muted-foreground mt-2">
        {prayerTimes.length > 0 && `Showing ${prayerTimes.length} prayer time entries`}
      </div>
    </div>
  );
};

export default PrayerTimesTableEditor;
