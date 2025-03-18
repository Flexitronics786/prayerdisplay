
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
import { importPrayerTimesFromSheet } from "@/services/dataService";
import { toast } from "sonner";
import { Loader2, Upload } from 'lucide-react';

interface GoogleSheetsImporterProps {
  onImportComplete?: () => void;
}

const GoogleSheetsImporter = ({ onImportComplete }: GoogleSheetsImporterProps) => {
  const [sheetId, setSheetId] = useState('');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from Google Sheets</CardTitle>
        <CardDescription>
          Enter the ID of a Google Sheet to import prayer times data.
          The sheet must be publicly accessible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sheetId">Google Sheet ID</Label>
          <Input
            id="sheetId"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          />
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
            value={isPublic ? "true" : "false"}
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
        </div>
      </CardContent>
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
