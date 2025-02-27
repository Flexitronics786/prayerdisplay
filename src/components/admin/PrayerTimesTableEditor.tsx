
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<DetailedPrayerTime>>({
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

  const handleChange = (field: keyof DetailedPrayerTime, value: string, id?: string) => {
    if (id) {
      // Editing existing entry
      setPrayerTimes(prayerTimes.map(entry => 
        entry.id === id ? { ...entry, [field]: value } : entry
      ));
    } else {
      // New entry
      setNewEntry({ ...newEntry, [field]: value });
    }
  };

  const handleAdd = async () => {
    // Validate the new entry has all required fields
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

    try {
      const added = await addPrayerTimeEntry(newEntry as Omit<DetailedPrayerTime, 'id' | 'created_at'>);
      if (added) {
        setPrayerTimes([...prayerTimes, added]);
        setNewEntry({
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
        setIsAdding(false);
        toast.success("Prayer time entry added successfully");
      }
    } catch (error) {
      console.error("Error adding prayer time:", error);
      toast.error("Failed to add prayer time entry");
    }
  };

  const handleUpdate = async (id: string) => {
    const entryToUpdate = prayerTimes.find(entry => entry.id === id);
    if (!entryToUpdate) return;

    try {
      const updated = await updatePrayerTimeEntry(id, entryToUpdate);
      if (updated) {
        setEditingId(null);
        toast.success("Prayer time entry updated successfully");
      }
    } catch (error) {
      console.error("Error updating prayer time:", error);
      toast.error("Failed to update prayer time entry");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deletePrayerTimeEntry(id);
      if (success) {
        setPrayerTimes(prayerTimes.filter(entry => entry.id !== id));
        toast.success("Prayer time entry deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting prayer time:", error);
      toast.error("Failed to delete prayer time entry");
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading prayer times...</div>;
  }

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Prayer Times Table</h3>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-mosque-accent hover:bg-mosque-accent/80 text-white"
        >
          {isAdding ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {isAdding ? "Cancel" : "Add New Entry"}
        </Button>
      </div>

      <ScrollArea className="h-[600px] rounded-md">
        <div className="w-full">
          <Table>
            <TableHeader className="sticky top-0 bg-mosque-dark z-10">
              <TableRow>
                <TableHead className="text-mosque-light w-[100px]">Date</TableHead>
                <TableHead className="text-mosque-light">Day</TableHead>
                <TableHead className="text-mosque-light">Sehri End</TableHead>
                <TableHead className="text-mosque-light">Fajr Jamat</TableHead>
                <TableHead className="text-mosque-light">Sunrise</TableHead>
                <TableHead className="text-mosque-light">Zuhr Start</TableHead>
                <TableHead className="text-mosque-light">Zuhr Jamat</TableHead>
                <TableHead className="text-mosque-light">Asr Start</TableHead>
                <TableHead className="text-mosque-light">Asr Jamat</TableHead>
                <TableHead className="text-mosque-light">Maghrib/Iftar</TableHead>
                <TableHead className="text-mosque-light">Isha Start</TableHead>
                <TableHead className="text-mosque-light">1st Jama'at</TableHead>
                <TableHead className="text-mosque-light">2nd Jama'at</TableHead>
                <TableHead className="text-mosque-light w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow className="border-t border-white/10">
                  <TableCell>
                    <Input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newEntry.day}
                      onChange={(e) => handleChange('day', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="e.g., Monday"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.sehri_end}
                      onChange={(e) => handleChange('sehri_end', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.fajr_jamat}
                      onChange={(e) => handleChange('fajr_jamat', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.sunrise}
                      onChange={(e) => handleChange('sunrise', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.zuhr_start}
                      onChange={(e) => handleChange('zuhr_start', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.zuhr_jamat}
                      onChange={(e) => handleChange('zuhr_jamat', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.asr_start}
                      onChange={(e) => handleChange('asr_start', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.asr_jamat}
                      onChange={(e) => handleChange('asr_jamat', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.maghrib_iftar}
                      onChange={(e) => handleChange('maghrib_iftar', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.isha_start}
                      onChange={(e) => handleChange('isha_start', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.isha_first_jamat}
                      onChange={(e) => handleChange('isha_first_jamat', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={newEntry.isha_second_jamat}
                      onChange={(e) => handleChange('isha_second_jamat', e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={handleAdd}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setIsAdding(false)}
                        variant="destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              
              {prayerTimes.map((entry) => (
                <TableRow key={entry.id} className="border-t border-white/10">
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleChange('date', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.date
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        value={entry.day}
                        onChange={(e) => handleChange('day', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.day
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.sehri_end}
                        onChange={(e) => handleChange('sehri_end', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.sehri_end
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.fajr_jamat}
                        onChange={(e) => handleChange('fajr_jamat', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.fajr_jamat
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.sunrise}
                        onChange={(e) => handleChange('sunrise', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.sunrise
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.zuhr_start}
                        onChange={(e) => handleChange('zuhr_start', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.zuhr_start
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.zuhr_jamat}
                        onChange={(e) => handleChange('zuhr_jamat', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.zuhr_jamat
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.asr_start}
                        onChange={(e) => handleChange('asr_start', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.asr_start
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.asr_jamat}
                        onChange={(e) => handleChange('asr_jamat', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.asr_jamat
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.maghrib_iftar}
                        onChange={(e) => handleChange('maghrib_iftar', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.maghrib_iftar
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.isha_start}
                        onChange={(e) => handleChange('isha_start', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.isha_start
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.isha_first_jamat}
                        onChange={(e) => handleChange('isha_first_jamat', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.isha_first_jamat
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input
                        type="time"
                        value={entry.isha_second_jamat}
                        onChange={(e) => handleChange('isha_second_jamat', e.target.value, entry.id)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    ) : (
                      entry.isha_second_jamat
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
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => setEditingId(null)}
                            variant="destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => setEditingId(entry.id)}
                            className="bg-mosque-accent hover:bg-mosque-accent/80"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleDelete(entry.id)}
                            variant="destructive"
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
      </ScrollArea>
      
      <div className="mt-4 text-mosque-light/70 text-xs">
        <p>• All times should be in 24-hour format (HH:MM)</p>
        <p>• Date should be in YYYY-MM-DD format</p>
        <p>• The date in the table will be used for prayer times on the display</p>
      </div>
    </div>
  );
};

export default PrayerTimesTableEditor;
