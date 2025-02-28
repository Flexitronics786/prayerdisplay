import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  fetchAllPrayerTimes, 
  addPrayerTimeEntry, 
  updatePrayerTimeEntry, 
  deletePrayerTimeEntry,
  importPrayerTimesFromSheet,
  deleteAllPrayerTimes
} from "@/services/dataService";
import { DetailedPrayerTime } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Edit, 
  Loader2, 
  Plus, 
  Save, 
  Trash, 
  Upload,
  X,
  Trash2
} from "lucide-react";

const PrayerTimesTableEditor = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Form states
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
  
  // Import form states
  const [importData, setImportData] = useState({
    sheetId: '',
    tabName: 'Sheet1',
    hasHeaderRow: true,
    isPublic: true
  });
  
  // Fetch prayer times data
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
  
  // Listen for storage events (for cross-tab updates)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'local-prayer-times') {
        // Refresh data when local storage changes
        queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queryClient]);
  
  // Reset form when dialog closes
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
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle import form input changes
  const handleImportInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setImportData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle checkbox changes for import form
  const handleImportCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setImportData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle select changes for import form
  const handleImportSelectChange = (name: string, value: string) => {
    setImportData(prev => ({ ...prev, [name]: value === 'true' }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      const requiredFields = ['date', 'day', 'fajr_jamat', 'sunrise', 'zuhr_jamat', 'asr_jamat', 'maghrib_iftar', 'isha_first_jamat'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in the required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      if (editingId) {
        // Update existing entry
        const result = await updatePrayerTimeEntry(editingId, formData);
        if (result) {
          toast.success("Prayer time updated successfully");
          setIsAddDialogOpen(false);
          setEditingId(null);
          queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
        } else {
          toast.error("Failed to update prayer time");
        }
      } else {
        // Add new entry
        const result = await addPrayerTimeEntry(formData);
        if (result) {
          toast.success("Prayer time added successfully");
          setIsAddDialogOpen(false);
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
  
  // Handle import form submission
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate sheet ID
      if (!importData.sheetId) {
        toast.error("Please enter a Google Sheet ID");
        return;
      }
      
      const result = await importPrayerTimesFromSheet(
        importData.sheetId,
        importData.tabName,
        importData.hasHeaderRow,
        importData.isPublic
      );
      
      if (result.success) {
        toast.success(`Successfully imported ${result.count} prayer times`);
        if (result.error) {
          // This is a warning, not an error
          toast.warning(result.error);
        }
        setIsImportDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
      } else {
        toast.error(result.error || "Failed to import prayer times");
      }
    } catch (error) {
      console.error("Error importing prayer times:", error);
      toast.error("An error occurred while importing prayer times");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle edit button click
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
  
  // Handle delete button click
  const handleDelete = async (id: string) => {
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

  // Handle delete all data
  const handleDeleteAllData = async () => {
    setIsDeletingAll(true);
    try {
      const result = await deleteAllPrayerTimes();
      if (result) {
        toast.success("All prayer times data has been deleted");
        setIsDeleteDialogOpen(false);
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
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
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
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete All Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete All Prayer Times Data</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete ALL prayer times data? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
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
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import from Google Sheets
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Prayer Times from Google Sheets</DialogTitle>
                <DialogDescription>
                  Enter the ID of a Google Sheet to import prayer times data.
                  The sheet must be publicly accessible and have the correct column format.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sheetId">Google Sheet ID</Label>
                  <Input
                    id="sheetId"
                    name="sheetId"
                    value={importData.sheetId}
                    onChange={handleImportInputChange}
                    placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The ID is the part of the URL between /d/ and /edit
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tabName">Sheet/Tab Name</Label>
                  <Input
                    id="tabName"
                    name="tabName"
                    value={importData.tabName}
                    onChange={handleImportInputChange}
                    placeholder="Sheet1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hasHeaderRow">First Row is Header</Label>
                  <Select
                    value={importData.hasHeaderRow ? "true" : "false"}
                    onValueChange={(value) => handleImportSelectChange("hasHeaderRow", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="isPublic">Sheet is Public</Label>
                  <Select
                    value={importData.isPublic ? "true" : "false"}
                    onValueChange={(value) => handleImportSelectChange("isPublic", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No (Not Supported)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                    setIsAddDialogOpen(false);
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
        </div>
      </div>
      
      <div className="rounded-md border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50">
                <TableHead className="w-[180px]">Date</TableHead>
                <TableHead>Sehri</TableHead>
                <TableHead>Fajr</TableHead>
                <TableHead>Sunrise</TableHead>
                <TableHead>Zuhr</TableHead>
                <TableHead>Asr</TableHead>
                <TableHead>Maghrib</TableHead>
                <TableHead>Isha</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prayerTimes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No prayer times found. Add some using the button above.
                  </TableCell>
                </TableRow>
              ) : (
                prayerTimes.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-amber-50/50">
                    <TableCell className="font-medium">
                      <div>{formatDate(entry.date)}</div>
                      <div className="text-xs text-muted-foreground">{entry.day}</div>
                    </TableCell>
                    <TableCell>{entry.sehri_end?.slice(0, 5) || "-"}</TableCell>
                    <TableCell>{entry.fajr_jamat?.slice(0, 5) || "-"}</TableCell>
                    <TableCell>{entry.sunrise?.slice(0, 5) || "-"}</TableCell>
                    <TableCell>
                      {entry.zuhr_start?.slice(0, 5) ? (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Start: {entry.zuhr_start.slice(0, 5)}</div>
                          <div>Jamat: {entry.zuhr_jamat?.slice(0, 5) || "-"}</div>
                        </div>
                      ) : (
                        entry.zuhr_jamat?.slice(0, 5) || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.asr_start?.slice(0, 5) ? (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Start: {entry.asr_start.slice(0, 5)}</div>
                          <div>Jamat: {entry.asr_jamat?.slice(0, 5) || "-"}</div>
                        </div>
                      ) : (
                        entry.asr_jamat?.slice(0, 5) || "-"
                      )}
                    </TableCell>
                    <TableCell>{entry.maghrib_iftar?.slice(0, 5) || "-"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {entry.isha_start?.slice(0, 5) && (
                          <div className="text-xs text-muted-foreground">Start: {entry.isha_start.slice(0, 5)}</div>
                        )}
                        <div>1st: {entry.isha_first_jamat?.slice(0, 5) || "-"}</div>
                        {entry.isha_second_jamat?.slice(0, 5) && (
                          <div>2nd: {entry.isha_second_jamat.slice(0, 5)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entry)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          title="Delete"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mt-2">
        {prayerTimes.length > 0 && `Showing ${prayerTimes.length} prayer time entries`}
      </div>
    </div>
  );
};

export default PrayerTimesTableEditor;
