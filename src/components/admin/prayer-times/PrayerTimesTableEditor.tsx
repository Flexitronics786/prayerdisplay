import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pencil, ClipboardEdit, FileSpreadsheet, RefreshCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DetailedPrayerTime } from "@/types";
import { fetchAllPrayerTimes, deletePrayerTimeEntry, clearPrayerTimesCache } from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddEditPrayerTimeDialog } from "./AddEditPrayerTimeDialog";
import { DeleteAllPrayerTimesDialog } from "./DeleteAllPrayerTimesDialog";
import { ImportPrayerTimesDialog } from "./ImportPrayerTimesDialog";

const PrayerTimesTableEditor = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Initialize empty form data
  const [formData, setFormData] = useState<Omit<DetailedPrayerTime, 'id' | 'created_at'>>({
    date: '',
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

  // Create a query function that correctly adheres to TanStack Query's expected signature
  const fetchPrayerTimesQuery = () => fetchAllPrayerTimes(true);

  // Use the query function with TanStack Query
  const { data: prayerTimes = [], isLoading, refetch } = useQuery({
    queryKey: ['prayerTimes'],
    queryFn: fetchPrayerTimesQuery,
  });

  // Helper function to refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      clearPrayerTimesCache();
      await refetch();
      toast.success("Prayer times refreshed from database");
    } catch (error) {
      toast.error("Failed to refresh prayer times");
      console.error("Error refreshing prayer times:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (prayerTime: DetailedPrayerTime) => {
    setEditingId(prayerTime.id);
    
    // Set form data with current values
    setFormData({
      date: prayerTime.date || '',
      day: prayerTime.day || '',
      sehri_end: prayerTime.sehri_end || '',
      fajr_jamat: prayerTime.fajr_jamat || '',
      sunrise: prayerTime.sunrise || '',
      zuhr_start: prayerTime.zuhr_start || '',
      zuhr_jamat: prayerTime.zuhr_jamat || '',
      asr_start: prayerTime.asr_start || '',
      asr_jamat: prayerTime.asr_jamat || '',
      maghrib_iftar: prayerTime.maghrib_iftar || '',
      isha_start: prayerTime.isha_start || '',
      isha_first_jamat: prayerTime.isha_first_jamat || '',
      isha_second_jamat: prayerTime.isha_second_jamat || ''
    });
    
    setIsAddDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this prayer time?")) {
      try {
        const result = await deletePrayerTimeEntry(id);
        if (result) {
          toast.success("Prayer time deleted successfully");
          queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
        } else {
          toast.error("Failed to delete prayer time");
        }
      } catch (error) {
        console.error("Error deleting prayer time:", error);
        toast.error("An error occurred while deleting the prayer time");
      }
    }
  };

  // Handle add new button click
  const handleAddNewClick = () => {
    // Reset form to empty values
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      day: format(new Date(), 'EEEE'),
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
    
    setEditingId(null);
    setIsAddDialogOpen(true);
  };
  
  // Filter prayer times by search term
  const filteredPrayerTimes = searchTerm.trim() === '' 
    ? prayerTimes 
    : prayerTimes.filter(prayer => 
        prayer.date.includes(searchTerm) || 
        prayer.day.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
  // Sort by date (newest first)
  const sortedPrayerTimes = [...filteredPrayerTimes].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
        <Input
          placeholder="Search by date or day..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAddNewClick} variant="default" className="flex items-center gap-2">
            <ClipboardEdit className="h-4 w-4" />
            Add New Entry
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteAllDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedPrayerTimes.length === 0 ? (
        <div className="text-center py-8 bg-muted rounded-md">
          <p>No prayer times found. Add a new entry or import from Google Sheets.</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Fajr</TableHead>
                <TableHead>Zuhr</TableHead>
                <TableHead>Asr</TableHead>
                <TableHead>Maghrib</TableHead>
                <TableHead>Isha</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPrayerTimes.map((prayerTime) => (
                <TableRow key={prayerTime.id}>
                  <TableCell>{prayerTime.date}</TableCell>
                  <TableCell>{prayerTime.day}</TableCell>
                  <TableCell>{prayerTime.fajr_jamat.slice(0, 5)}</TableCell>
                  <TableCell>{prayerTime.zuhr_jamat.slice(0, 5)}</TableCell>
                  <TableCell>{prayerTime.asr_jamat.slice(0, 5)}</TableCell>
                  <TableCell>{prayerTime.maghrib_iftar.slice(0, 5)}</TableCell>
                  <TableCell>{prayerTime.isha_first_jamat.slice(0, 5)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditClick(prayerTime)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteClick(prayerTime.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <AddEditPrayerTimeDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        setEditingId={setEditingId}
      />
      
      <ImportPrayerTimesDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
      
      <DeleteAllPrayerTimesDialog
        isOpen={isDeleteAllDialogOpen}
        onOpenChange={setIsDeleteAllDialogOpen}
      />
    </div>
  );
};

export default PrayerTimesTableEditor;
