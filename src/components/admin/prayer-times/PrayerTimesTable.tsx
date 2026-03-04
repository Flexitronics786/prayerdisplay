
import { useState } from "react";
import { Check, X, Trash } from "lucide-react";
import { deletePrayerTimeEntry, updatePrayerTimeEntry } from "@/services/dataService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DetailedPrayerTime } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface PrayerTimesTableProps {
  prayerTimes: DetailedPrayerTime[];
  onEdit: (entry: DetailedPrayerTime) => void; // kept for API compatibility
}

type EditValues = Omit<DetailedPrayerTime, "id" | "created_at">;

const emptyEdit = (entry: DetailedPrayerTime): EditValues => ({
  date: entry.date,
  day: entry.day,
  sehri_end: entry.sehri_end || "",
  fajr_jamat: entry.fajr_jamat || "",
  sunrise: entry.sunrise || "",
  zuhr_start: entry.zuhr_start || "",
  zuhr_jamat: entry.zuhr_jamat || "",
  asr_start: entry.asr_start || "",
  asr_jamat: entry.asr_jamat || "",
  maghrib_iftar: entry.maghrib_iftar || "",
  isha_start: entry.isha_start || "",
  isha_first_jamat: entry.isha_first_jamat || "",
  isha_second_jamat: entry.isha_second_jamat || "",
});

// Tiny time input that accepts HH:MM
const TimeInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <input
    type="time"
    value={value?.slice(0, 5) || ""}
    onChange={(e) => onChange(e.target.value)}
    className="w-20 border border-amber-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
  />
);

export const PrayerTimesTable = ({ prayerTimes }: PrayerTimesTableProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (entry: DetailedPrayerTime) => {
    setEditingId(entry.id);
    setEditValues(emptyEdit(entry));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const set = (field: keyof EditValues, value: string) => {
    setEditValues((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const saveEdit = async () => {
    if (!editingId || !editValues) return;
    setIsSaving(true);
    try {
      const result = await updatePrayerTimeEntry(editingId, editValues);
      if (result) {
        toast.success("Prayer time updated");
        queryClient.invalidateQueries({ queryKey: ["prayerTimes"] });
        setEditingId(null);
        setEditValues(null);
      } else {
        toast.error("Failed to update prayer time");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this prayer time?")) return;
    try {
      const result = await deletePrayerTimeEntry(id);
      if (result) {
        toast.success("Prayer time deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["prayerTimes"] });
      } else {
        toast.error("Failed to delete prayer time");
      }
    } catch {
      toast.error("An error occurred while deleting the prayer time");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="rounded-md border bg-white max-h-[600px] overflow-auto">
      <div className="relative">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-amber-50">
              <TableHead className="w-[160px]">Date</TableHead>
              <TableHead>Sehri</TableHead>
              <TableHead>Fajr</TableHead>
              <TableHead>Sunrise</TableHead>
              <TableHead>Zuhr</TableHead>
              <TableHead>Asr</TableHead>
              <TableHead>Maghrib</TableHead>
              <TableHead>Isha</TableHead>
              <TableHead className="text-right w-[90px]">Actions</TableHead>
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
              prayerTimes.map((entry) => {
                const isEditing = editingId === entry.id;
                return (
                  <TableRow
                    key={entry.id}
                    className={isEditing ? "bg-amber-50 ring-1 ring-amber-300" : "hover:bg-amber-50/50"}
                  >
                    {/* Date — never editable */}
                    <TableCell className="font-medium">
                      <div>{formatDate(entry.date)}</div>
                      <div className="text-xs text-muted-foreground">{entry.day}</div>
                    </TableCell>

                    {/* Sehri */}
                    <TableCell>
                      {isEditing
                        ? <TimeInput value={editValues!.sehri_end} onChange={(v) => set("sehri_end", v)} />
                        : entry.sehri_end?.slice(0, 5) || "–"}
                    </TableCell>

                    {/* Fajr jamat */}
                    <TableCell>
                      {isEditing
                        ? <TimeInput value={editValues!.fajr_jamat} onChange={(v) => set("fajr_jamat", v)} />
                        : entry.fajr_jamat?.slice(0, 5) || "–"}
                    </TableCell>

                    {/* Sunrise */}
                    <TableCell>
                      {isEditing
                        ? <TimeInput value={editValues!.sunrise} onChange={(v) => set("sunrise", v)} />
                        : entry.sunrise?.slice(0, 5) || "–"}
                    </TableCell>

                    {/* Zuhr */}
                    <TableCell>
                      {isEditing ? (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Start</div>
                          <TimeInput value={editValues!.zuhr_start} onChange={(v) => set("zuhr_start", v)} />
                          <div className="text-xs text-muted-foreground">Jamat</div>
                          <TimeInput value={editValues!.zuhr_jamat} onChange={(v) => set("zuhr_jamat", v)} />
                        </div>
                      ) : (
                        entry.zuhr_start?.slice(0, 5) ? (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Start: {entry.zuhr_start.slice(0, 5)}</div>
                            <div>Jamat: {entry.zuhr_jamat?.slice(0, 5) || "–"}</div>
                          </div>
                        ) : entry.zuhr_jamat?.slice(0, 5) || "–"
                      )}
                    </TableCell>

                    {/* Asr */}
                    <TableCell>
                      {isEditing ? (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Start</div>
                          <TimeInput value={editValues!.asr_start} onChange={(v) => set("asr_start", v)} />
                          <div className="text-xs text-muted-foreground">Jamat</div>
                          <TimeInput value={editValues!.asr_jamat} onChange={(v) => set("asr_jamat", v)} />
                        </div>
                      ) : (
                        entry.asr_start?.slice(0, 5) ? (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Start: {entry.asr_start.slice(0, 5)}</div>
                            <div>Jamat: {entry.asr_jamat?.slice(0, 5) || "–"}</div>
                          </div>
                        ) : entry.asr_jamat?.slice(0, 5) || "–"
                      )}
                    </TableCell>

                    {/* Maghrib */}
                    <TableCell>
                      {isEditing
                        ? <TimeInput value={editValues!.maghrib_iftar} onChange={(v) => set("maghrib_iftar", v)} />
                        : entry.maghrib_iftar?.slice(0, 5) || "–"}
                    </TableCell>

                    {/* Isha */}
                    <TableCell>
                      {isEditing ? (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Start</div>
                          <TimeInput value={editValues!.isha_start} onChange={(v) => set("isha_start", v)} />
                          <div className="text-xs text-muted-foreground">Jamat</div>
                          <TimeInput value={editValues!.isha_first_jamat} onChange={(v) => set("isha_first_jamat", v)} />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {entry.isha_start?.slice(0, 5) && (
                            <div className="text-xs text-muted-foreground">Start: {entry.isha_start.slice(0, 5)}</div>
                          )}
                          <div>Jamat: {entry.isha_first_jamat?.slice(0, 5) || "–"}</div>
                        </div>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={saveEdit}
                            disabled={isSaving}
                            title="Save"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={cancelEdit}
                            title="Cancel"
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(entry)}
                            title="Edit"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry.id)}
                            title="Delete"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
