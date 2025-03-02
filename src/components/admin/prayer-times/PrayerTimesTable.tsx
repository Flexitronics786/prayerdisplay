
import { useState } from "react";
import { Edit, Trash } from "lucide-react";
import { deletePrayerTimeEntry } from "@/services/dataService";
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
  onEdit: (entry: DetailedPrayerTime) => void;
}

export const PrayerTimesTable = ({ 
  prayerTimes,
  onEdit 
}: PrayerTimesTableProps) => {
  const queryClient = useQueryClient();
  
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
  
  return (
    <div className="rounded-md border bg-white">
      <div className="overflow-x-auto">
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
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
                          onClick={() => onEdit(entry)}
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
    </div>
  );
};
