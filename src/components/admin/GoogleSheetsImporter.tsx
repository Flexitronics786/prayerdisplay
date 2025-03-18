
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
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import { testSupabaseConnection } from "@/integrations/supabase/client";

interface GoogleSheetsImporterProps {
  onImportComplete?: () => void;
}

const GoogleSheetsImporter = ({ onImportComplete }: GoogleSheetsImporterProps) => {
  const [sheetId, setSheetId] = useState('');
  const [tabName, setTabName] = useState('Sheet1');
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  // Check Supabase connection on component mount
  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const isConnected = await testSupabaseConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      if (!isConnected) {
        toast.warning("Cannot connect to database. Data might only be saved locally.");
      }
    } catch (error) {
      console.error("Error checking connection:", error);
      setConnectionStatus('disconnected');
      toast.warning("Cannot connect to database. Data might only be saved locally.");
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleImport = async () => {
    if (!sheetId.trim()) {
      toast.error('Please enter a Google Sheet ID');
      return;
    }

    setIsImporting(true);

    // Check connection before import
    try {
      const isConnected = await testSupabaseConnection();
      if (!isConnected) {
        toast.warning("Cannot connect to database. Import will continue but data might only be saved locally.");
      }
    } catch (error) {
      console.error("Connection check failed:", error);
      toast.warning("Connection check failed. Import will continue but data might only be saved locally.");
    }

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
        {connectionStatus === 'disconnected' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              <p className="text-sm text-yellow-700">
                Database connection unavailable. Data will be saved locally only until connection is restored.
              </p>
            </div>
          </div>
        )}

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

        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkConnection}
          disabled={isCheckingConnection}
          className="mt-2"
        >
          {isCheckingConnection ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking connection...
            </>
          ) : (
            <>
              Check database connection
            </>
          )}
        </Button>
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
