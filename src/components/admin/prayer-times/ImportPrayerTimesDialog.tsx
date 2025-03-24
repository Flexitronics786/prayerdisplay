
import { useState } from "react";
import { Loader2, Upload, AlertCircle } from "lucide-react";
import { importPrayerTimesFromSheet } from "@/services/dataService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ImportPrayerTimesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportPrayerTimesDialog = ({ 
  isOpen, 
  onOpenChange 
}: ImportPrayerTimesDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  const [importData, setImportData] = useState({
    sheetUrl: '',
    tabName: 'Sheet1',
    hasHeaderRow: true,
    isPublic: true
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setImportData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImportSelectChange = (name: string, value: string) => {
    setImportData(prev => ({ ...prev, [name]: value === 'true' }));
  };
  
  const extractSheetId = (url: string): string => {
    // Extract Sheet ID from various Google Sheets URL formats
    if (!url) return '';
    
    // Handles URLs like: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // If not a URL, treat as direct ID
    if (!url.includes('/') && !url.includes('\\')) {
      return url.trim();
    }
    
    return '';
  };
  
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!importData.sheetUrl) {
        toast.error("Please enter a Google Sheet URL or ID");
        setIsSubmitting(false);
        return;
      }
      
      const sheetId = extractSheetId(importData.sheetUrl);
      
      if (!sheetId) {
        toast.error("Could not extract a valid Sheet ID from the provided URL");
        setIsSubmitting(false);
        return;
      }
      
      const result = await importPrayerTimesFromSheet(
        sheetId,
        importData.tabName,
        importData.hasHeaderRow,
        importData.isPublic
      );
      
      if (result.success) {
        toast.success(`Successfully imported ${result.count} prayer times`);
        if (result.error) {
          toast.warning(result.error);
        }
        onOpenChange(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import from Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Prayer Times from Google Sheets</DialogTitle>
          <DialogDescription>
            Enter the URL of a Google Sheet to import prayer times data.
            The sheet must be publicly accessible and have the correct column format.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-800" />
          <AlertTitle>Data Format Requirements</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside text-sm space-y-1 text-amber-800">
              <li><strong>Date:</strong> YYYY-MM-DD format (e.g., 2024-06-15)</li>
              <li><strong>Day:</strong> Full day name (e.g., Monday, Tuesday)</li>
              <li><strong>Time Fields:</strong> 24-hour format HH:MM (e.g., 05:30, 17:45)</li>
              <li><strong>Required Fields:</strong> date, day, fajr_jamat, sunrise, zuhr_jamat, asr_jamat, maghrib_iftar, isha_first_jamat</li>
              <li><strong>Column Names:</strong> Must match the database field names exactly if using header row</li>
              <li><strong>Column Order:</strong> date, day, fajr_start, fajr_jamat, sunrise, zuhr_start, zuhr_jamat, asr_start, asr_jamat, maghrib_iftar, isha_start, isha_first_jamat, isha_second_jamat</li>
              <li><strong>Sheet Sharing:</strong> Set to "Anyone with the link can view"</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleImport} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheetUrl">Google Sheet URL</Label>
            <Input
              id="sheetUrl"
              name="sheetUrl"
              value={importData.sheetUrl}
              onChange={handleInputChange}
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
              required
            />
            <p className="text-xs text-muted-foreground">
              Paste the full URL or just the Sheet ID from the address bar
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tabName">Sheet/Tab Name</Label>
            <Input
              id="tabName"
              name="tabName"
              value={importData.tabName}
              onChange={handleInputChange}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
};
