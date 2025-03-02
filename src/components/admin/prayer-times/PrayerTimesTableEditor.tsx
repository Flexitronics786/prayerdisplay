
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllPrayerTimes } from "@/services/dataService";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImportPrayerTimesDialog } from "./ImportPrayerTimesDialog";
import { AddEditPrayerTimeDialog } from "./AddEditPrayerTimeDialog";
import { PrayerTimesTable } from "./PrayerTimesTable";
import { DetailedPrayerTime } from "@/types";

const PrayerTimesTableEditor = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'local-prayer-times') {
        queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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
  
  const handleEdit = (entry: DetailedPrayerTime) => {
    setEditingId(entry.id);
    setFormData({
      date: entry.date,
      day: entry.day,
      sehri_end: entry.sehri_end || '',
      fajr_jamat: entry.fajr_jamat || '',
      sunrise: entry.sunrise || '',
      zuhr_start: entry.zuhr_start || '',
      zuhr_jamat: entry.zuhr_jamat || '',
      asr_start: entry.asr_start || '',
      asr_jamat: entry.asr_jamat || '',
      maghrib_iftar: entry.maghrib_iftar || '',
      isha_start: entry.isha_start || '',
      isha_first_jamat: entry.isha_first_jamat || '',
      isha_second_jamat: entry.isha_second_jamat || ''
    });
    setIsAddDialogOpen(true);
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
          <ImportPrayerTimesDialog
            isOpen={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          />
          
          <Button 
            variant="default" 
            className="flex items-center gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Prayer Time
          </Button>
          
          <AddEditPrayerTimeDialog
            isOpen={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            editingId={editingId}
            formData={formData}
            setFormData={setFormData}
            setEditingId={setEditingId}
          />
        </div>
      </div>
      
      <PrayerTimesTable 
        prayerTimes={prayerTimes} 
        onEdit={handleEdit} 
      />
      
      <div className="text-xs text-muted-foreground mt-2">
        {prayerTimes.length > 0 && `Showing ${prayerTimes.length} prayer time entries`}
      </div>
    </div>
  );
};

export default PrayerTimesTableEditor;
