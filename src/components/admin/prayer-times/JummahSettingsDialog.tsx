import { useState, useEffect } from "react";
import { Loader2, Save, Clock } from "lucide-react";
import { toast } from "sonner";
import { JummahSettings, fetchJummahSettings, updateJummahSettings } from "@/services/settingsService";
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
} from "@/components/ui/dialog";

interface JummahSettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const JummahSettingsDialog = ({
    isOpen,
    onOpenChange
}: JummahSettingsDialogProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<JummahSettings>({
        jamat1: '',
        jamat2: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const settings = await fetchJummahSettings();
            setFormData(settings);
        } catch (error) {
            console.error("Failed to load jummah settings:", error);
            toast.error("Failed to load current Jummah settings");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (!formData.jamat1) {
                toast.error("Please fill in the required field: Jamat 1");
                setIsSubmitting(false);
                return;
            }

            const result = await updateJummahSettings(formData);
            if (result) {
                toast.success("Global Jummah settings updated successfully");
                onOpenChange(false);
            } else {
                toast.error("Failed to update Jummah settings");
            }
        } catch (error) {
            console.error("Error updating Jummah settings:", error);
            toast.error("An error occurred while saving the settings");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Global Jummah Settings</DialogTitle>
                    <DialogDescription>
                        These times will permanently apply to the Jummah tile on the main display every Friday.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="jamat1">Jummah Jamat 1*</Label>
                                <div className="relative">
                                    <Input
                                        id="jamat1"
                                        name="jamat1"
                                        type="time"
                                        value={formData.jamat1}
                                        onChange={handleInputChange}
                                        required
                                        className="pl-10"
                                    />
                                    <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="jamat2">Jummah Jamat 2 (Optional)</Label>
                                <div className="relative">
                                    <Input
                                        id="jamat2"
                                        name="jamat2"
                                        type="time"
                                        value={formData.jamat2}
                                        onChange={handleInputChange}
                                        className="pl-10"
                                    />
                                    <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Settings
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};
