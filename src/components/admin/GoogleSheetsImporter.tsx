
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { importPrayerTimesFromSheet } from '@/services/dataService';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

interface GoogleSheetsImporterProps {
  onImportComplete?: () => void;
}

const GoogleSheetsImporter = ({ onImportComplete }: GoogleSheetsImporterProps) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [tabName, setTabName] = useState('Sheet1');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isShowingAdvanced, setIsShowingAdvanced] = useState(false);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);

  const handleExtractSheetId = () => {
    try {
      // Extract sheet ID from URLs like:
      // https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7/edit#gid=0
      const regex = /\/d\/([-\w]{25,})/;
      const match = sheetUrl.match(regex);
      
      if (match && match[1]) {
        setSheetId(match[1]);
        toast.success("Sheet ID extracted successfully");
      } else {
        toast.error("Could not extract Sheet ID from URL");
      }
    } catch (error) {
      console.error("Error extracting sheet ID:", error);
      toast.error("Error processing the Sheet URL");
    }
  };

  const handleImport = async () => {
    if (!sheetId) {
      toast.error("Please enter a valid Google Sheet ID");
      return;
    }

    try {
      setIsLoading(true);
      const result = await importPrayerTimesFromSheet(sheetId, tabName, hasHeaderRow, isPublic);
      
      if (result.success) {
        toast.success(`Successfully imported ${result.count} prayer times entries`);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        toast.error(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("An unexpected error occurred during import");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-amber-800">Import Prayer Times from Google Sheets</CardTitle>
        <CardDescription>
          Import your prayer times data from a Google Sheet. The sheet must be publicly accessible or shared.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sheet-url">Google Sheet URL</Label>
          <div className="flex gap-2">
            <Input
              id="sheet-url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleExtractSheetId}
              variant="outline"
              className="whitespace-nowrap"
            >
              Extract ID
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sheet-id">Google Sheet ID</Label>
          <Input
            id="sheet-id"
            placeholder="1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This is the long string of characters in the Google Sheet URL.
          </p>
        </div>

        <Button
          variant="ghost"
          className="text-xs text-amber-600 hover:text-amber-800 p-0 h-auto"
          onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
        >
          {isShowingAdvanced ? "Hide" : "Show"} Advanced Options
        </Button>

        {isShowingAdvanced && (
          <>
            <div className="space-y-2">
              <Label htmlFor="tab-name">Sheet/Tab Name</Label>
              <Input
                id="tab-name"
                placeholder="Sheet1"
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The name of the sheet/tab in your Google Sheet document (default: Sheet1).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="has-header" 
                checked={hasHeaderRow} 
                onCheckedChange={checked => setHasHeaderRow(checked === true)}
              />
              <Label 
                htmlFor="has-header" 
                className="text-sm font-normal cursor-pointer"
              >
                Sheet has header row
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is-public" 
                checked={isPublic} 
                onCheckedChange={checked => setIsPublic(checked === true)}
              />
              <Label 
                htmlFor="is-public" 
                className="text-sm font-normal cursor-pointer"
              >
                Sheet is publicly accessible
              </Label>
            </div>
          </>
        )}

        <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
          <h4 className="text-sm font-medium text-amber-800 mb-2">Required Column Format</h4>
          <p className="text-xs text-amber-700 mb-2">
            Your Google Sheet should have the following columns in order:
          </p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>Date (YYYY-MM-DD format)</li>
            <li>Day (e.g., Monday, Tuesday)</li>
            <li>Sehri End (HH:MM 24h format)</li>
            <li>Fajr Jamat (HH:MM 24h format)</li>
            <li>Sunrise (HH:MM 24h format)</li>
            <li>Zuhr Start (HH:MM 24h format)</li>
            <li>Zuhr Jamat (HH:MM 24h format)</li>
            <li>Asr Start (HH:MM 24h format)</li>
            <li>Asr Jamat (HH:MM 24h format)</li>
            <li>Maghrib/Iftar (HH:MM 24h format)</li>
            <li>Isha Start (HH:MM 24h format)</li>
            <li>Isha First Jamat (HH:MM 24h format)</li>
            <li>Isha Second Jamat (HH:MM 24h format)</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button 
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          onClick={handleImport}
          disabled={isLoading || !sheetId}
        >
          {isLoading ? (
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
        <div className="text-xs text-amber-700 italic">
          Make sure your Google Sheet follows the required format before importing.
        </div>
      </CardFooter>
    </Card>
  );
};

export default GoogleSheetsImporter;
