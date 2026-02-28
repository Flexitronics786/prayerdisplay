
// Importing necessary components and hooks
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { importPrayerTimesFromSheet } from "@/services/dataService";
import { toast } from "sonner";
import { Loader2, Upload, AlertCircle, FileDown, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GoogleSheetsImporterProps {
  onImportComplete?: () => void;
}

const GoogleSheetsImporter = ({ onImportComplete }: GoogleSheetsImporterProps) => {
  const [sheetId, setSheetId] = useState('10LPLiUzagD0HGc1fDSiMYDGUbevG8T6OUNXoANP1GJ8');
  const [tabName, setTabName] = useState('Sheet1');
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!sheetId.trim()) {
      toast.error('Please enter a Google Sheet ID');
      return;
    }

    setIsImporting(true);

    try {
      const result = await importPrayerTimesFromSheet(
        sheetId,
        tabName,
        hasHeaderRow,
        isPublic
      );

      if (result.success) {
        toast.success(`Successfully imported ${result.count} prayer times`);
        if (result.error) {
          toast.warning(result.error);
        }
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        toast.error(result.error || 'Failed to import prayer times');
      }
    } catch (error) {
      console.error('Error importing from Google Sheets:', error);
      toast.error('An unexpected error occurred during import');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplateCSV = () => {
    const headers = "date,day,fajr_start,fajr_jamat,sunrise,zuhr_start,zuhr_jamat,asr_start,asr_jamat,maghrib_iftar,isha_start,isha_first_jamat";
    const sampleRow1 = "2024-06-15,Saturday,03:45,04:15,05:38,12:45,13:15,17:30,17:45,21:20,22:45,23:00";
    const sampleRow2 = "2024-06-16,Sunday,03:46,04:15,05:38,12:45,13:15,17:30,17:45,21:21,22:45,23:00";

    const csvContent = `${headers}\n${sampleRow1}\n${sampleRow2}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'prayer_times_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from Google Sheets</CardTitle>
        <CardDescription>
          Enter the ID of a Google Sheet to import prayer times data.
          The sheet must be publicly accessible.
        </CardDescription>
      </CardHeader>
      <ScrollArea className="h-[60vh]">
        <CardContent className="space-y-4">
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
                <li><strong>Column Order:</strong> date, day, fajr_start, fajr_jamat, sunrise, zuhr_start, zuhr_jamat, asr_start, asr_jamat, maghrib_iftar, isha_start, isha_first_jamat</li>
                <li><strong>Sheet Sharing:</strong> Set to "Anyone with the link can view"</li>
              </ul>
            </AlertDescription>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-amber-800 border-amber-300 hover:bg-amber-100"
                onClick={downloadTemplateCSV}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="sheetId">Google Sheet ID</Label>
            <div className="flex gap-2">
              <Input
                id="sheetId"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (sheetId) {
                    window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, '_blank');
                  }
                }}
                disabled={!sheetId}
                title="Open this Google Sheet in a new tab"
                className="shrink-0"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Sheet
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The ID is the part of the URL between /d/ and /edit
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tabName">Sheet/Tab Name</Label>
            <Input
              id="tabName"
              value={tabName}
              onChange={(e) => setTabName(e.target.value)}
              placeholder="e.g. Sheet1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hasHeaderRow">First Row is Header</Label>
            <Select
              value={hasHeaderRow ? "true" : "false"}
              onValueChange={(value) => setHasHeaderRow(value === "true")}
            >
              <SelectTrigger id="hasHeaderRow">
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
              value={isPublic ? "true" : "true"}
              onValueChange={(value) => setIsPublic(value === "true")}
            >
              <SelectTrigger id="isPublic">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No (Not Supported)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Make sure your sheet is shared with "Anyone with the link can view" permission
            </p>
          </div>
        </CardContent>
      </ScrollArea>
      <CardFooter>
        <Button onClick={handleImport} disabled={isImporting} className="w-full">
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import Prayer Times
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GoogleSheetsImporter;
