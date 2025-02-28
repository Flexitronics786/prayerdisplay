
import { useState, useEffect } from "react";
import { DetailedPrayerTime } from "@/types";
import { 
  fetchAllPrayerTimes, 
  addPrayerTimeEntry, 
  updatePrayerTimeEntry, 
  deletePrayerTimeEntry 
} from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

const PrayerTimesTableEditor = () => {
  const [prayerTimes, setPrayerTimes] = useState<DetailedPrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  
  const [newEntry, setNewEntry] = useState<Partial<DetailedPrayerTime>>({
    date: todayFormatted,
    day: dayName,
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

  const loadPrayerTimes = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllPrayerTimes();
      setPrayerTimes(data);
    } catch (error) {
      console.error("Error loading prayer times:", error);
      toast.error("Failed to load prayer times");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrayerTimes();
  }, []);

  const getDayNameFromDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const handleChange = (field: keyof DetailedPrayerTime, value: string, id?: string) => {
    if (id) {
      setPrayerTimes(prayerTimes.map(entry => {
        if (entry.id === id) {
          if (field === 'date') {
            return { ...entry, [field]: value, day: getDayNameFromDate(value) };
          }
          return { ...entry, [field]: value };
        }
        return entry;
      }));
    } else {
      if (field === 'date') {
        setNewEntry({ 
          ...newEntry, 
          [field]: value, 
          day: getDayNameFromDate(value) 
        });
      } else {
        setNewEntry({ ...newEntry, [field]: value });
      }
    }
  };

  const handleAdd = async () => {
    const requiredFields: (keyof DetailedPrayerTime)[] = [
      'date', 'day', 'sehri_end', 'fajr_jamat', 'sunrise', 'zuhr_start', 
      'zuhr_jamat', 'asr_start', 'asr_jamat', 'maghrib_iftar', 'isha_start', 
      'isha_first_jamat', 'isha_second_jamat'
    ];
    
    const missingFields = requiredFields.filter(field => !newEntry[field]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Submitting prayer time entry:", newEntry);
      const added = await addPrayerTimeEntry(newEntry as Omit<DetailedPrayerTime, 'id' | 'created_at'>);
      
      if (added) {
        console.log("Successfully added prayer time entry:", added);
        setPrayerTimes([...prayerTimes, added]);
        
        const currentDate = newEntry.date;
        setNewEntry({
          date: currentDate,
          day: getDayNameFromDate(currentDate || todayFormatted),
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
        
        setIsAdding(false);
        toast.success("Prayer time entry added successfully");
      } else {
        console.error("Failed to add prayer time entry - no data returned");
        toast.error("Failed to add prayer time entry");
      }
    } catch (error) {
      console.error("Error adding prayer time:", error);
      toast.error("Failed to add prayer time entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const entryToUpdate = prayerTimes.find(entry => entry.id === id);
    if (!entryToUpdate) return;

    setIsSubmitting(true);
    try {
      const updated = await updatePrayerTimeEntry(id, entryToUpdate);
      if (updated) {
        setEditingId(null);
        toast.success("Prayer time entry updated successfully");
      }
    } catch (error) {
      console.error("Error updating prayer time:", error);
      toast.error("Failed to update prayer time entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      const success = await deletePrayerTimeEntry(id);
      if (success) {
        setPrayerTimes(prayerTimes.filter(entry => entry.id !== id));
        toast.success("Prayer time entry deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting prayer time:", error);
      toast.error("Failed to delete prayer time entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4 text-amber-800">Loading prayer times...</div>;
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-amber-800">Prayer Times Table</h3>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-amber-600 hover:bg-amber-700 text-white"
          disabled={isSubmitting}
        >
          {isAdding ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {isAdding ? "Cancel" : "Add New Entry"}
        </Button>
      </div>

      <div className="w-full overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-amber-100 z-10">
            <TableRow>
              <TableHead className="text-amber-800 w-[100px]">Date</TableHead>
              <TableHead className="text-amber-800">Day</TableHead>
              <TableHead className="text-amber-800">Sehri End</TableHead>
              <TableHead className="text-amber-800">Fajr Jamat</TableHead>
              <TableHead className="text-amber-800">Sunrise</TableHead>
              <TableHead className="text-amber-800">Zuhr Start</TableHead>
              <TableHead className="text-amber-800">Zuhr Jamat</TableHead>
              <TableHead className="text-amber-800">Asr Start</TableHead>
              <TableHead className="text-amber-800">Asr Jamat</TableHead>
              <TableHead className="text-amber-800">Maghrib/Iftar</TableHead>
              <TableHead className="text-amber-800">Isha Start</TableHead>
              <TableHead className="text-amber-800">1st Jama'at</TableHead>
              <TableHead className="text-amber-800">2nd Jama'at</TableHead>
              <TableHead className="text-amber-800 w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow className="border-t border-amber-100">
                <TableCell>
                  <Input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newEntry.day}
                    readOnly
                    className="bg-amber-50/50 border-amber-200 text-amber-700 cursor-not-allowed w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.sehri_end || ''}
                    onChange={(e) => handleChange('sehri_end', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.fajr_jamat || ''}
                    onChange={(e) => handleChange('fajr_jamat', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.sunrise || ''}
                    onChange={(e) => handleChange('sunrise', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.zuhr_start || ''}
                    onChange={(e) => handleChange('zuhr_start', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.zuhr_jamat || ''}
                    onChange={(e) => handleChange('zuhr_jamat', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.asr_start || ''}
                    onChange={(e) => handleChange('asr_start', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.asr_jamat || ''}
                    onChange={(e) => handleChange('asr_jamat', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.maghrib_iftar || ''}
                    onChange={(e) => handleChange('maghrib_iftar', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.isha_start || ''}
                    onChange={(e) => handleChange('isha_start', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.isha_first_jamat || ''}
                    onChange={(e) => handleChange('isha_first_jamat', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={newEntry.isha_second_jamat || ''}
                    onChange={(e) => handleChange('isha_second_jamat', e.target.value)}
                    className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={handleAdd}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 
                        <span className="animate-spin mr-1">⏳</span> : 
                        <Check className="h-4 w-4" />
                      }
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setIsAdding(false)}
                      variant="destructive"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {prayerTimes.map((entry) => (
              <TableRow key={entry.id} className="border-t border-amber-100">
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => handleChange('date', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.date}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      value={entry.day}
                      readOnly
                      className="bg-amber-50/50 border-amber-200 text-amber-700 cursor-not-allowed w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.day}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.sehri_end}
                      onChange={(e) => handleChange('sehri_end', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.sehri_end}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.fajr_jamat}
                      onChange={(e) => handleChange('fajr_jamat', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.fajr_jamat}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.sunrise}
                      onChange={(e) => handleChange('sunrise', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.sunrise}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.zuhr_start}
                      onChange={(e) => handleChange('zuhr_start', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.zuhr_start}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.zuhr_jamat}
                      onChange={(e) => handleChange('zuhr_jamat', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.zuhr_jamat}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.asr_start}
                      onChange={(e) => handleChange('asr_start', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.asr_start}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.asr_jamat}
                      onChange={(e) => handleChange('asr_jamat', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.asr_jamat}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.maghrib_iftar}
                      onChange={(e) => handleChange('maghrib_iftar', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.maghrib_iftar}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.isha_start}
                      onChange={(e) => handleChange('isha_start', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.isha_start}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.isha_first_jamat}
                      onChange={(e) => handleChange('isha_first_jamat', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.isha_first_jamat}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      type="time"
                      value={entry.isha_second_jamat}
                      onChange={(e) => handleChange('isha_second_jamat', e.target.value, entry.id)}
                      className="bg-amber-50 border-amber-200 text-amber-900 w-full"
                    />
                  ) : (
                    <span className="text-amber-900">{entry.isha_second_jamat}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {editingId === entry.id ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdate(entry.id)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 
                            <span className="animate-spin mr-1">⏳</span> : 
                            <Check className="h-4 w-4" />
                          }
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => setEditingId(null)}
                          variant="destructive"
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => setEditingId(entry.id)}
                          className="bg-amber-600 hover:bg-amber-700"
                          disabled={isSubmitting}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleDelete(entry.id)}
                          variant="destructive"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-4 text-amber-700 text-xs">
        <p>• All times should be in 24-hour format (HH:MM)</p>
        <p>• Date should be in YYYY-MM-DD format</p>
        <p>• The date in the table will be used for prayer times on the display</p>
        <p>• Day will be automatically determined from the date</p>
      </div>
    </div>
  );
};

export default PrayerTimesTableEditor;
