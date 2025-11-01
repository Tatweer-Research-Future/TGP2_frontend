import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string; // datetime-local format string
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  disabled = false,
  className,
  label,
  description,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Parse the datetime-local value
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    return new Date(value);
  }, [value]);

  const timeValue = React.useMemo(() => {
    if (!value) return "09:00";
    const date = new Date(value);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }, [value]);

  const displayValue = React.useMemo(() => {
    if (!dateValue) return placeholder;
    return `${dateValue.toLocaleDateString()} at ${timeValue}`;
  }, [dateValue, timeValue, placeholder]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.("");
      return;
    }
    
    // Preserve existing time or use current time
    const [hours, minutes] = timeValue.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
    
    // Convert to datetime-local format
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hoursStr = date.getHours().toString().padStart(2, "0");
    const minutesStr = date.getMinutes().toString().padStart(2, "0");
    
    const datetimeLocal = `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
    onChange?.(datetimeLocal);
  };

  const handleTimeChange = (time: string) => {
    if (!dateValue) {
      // If no date is selected, use today
      const today = new Date();
      const [hours, minutes] = time.split(":").map(Number);
      today.setHours(hours, minutes, 0, 0);
      
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const day = today.getDate().toString().padStart(2, "0");
      const hoursStr = today.getHours().toString().padStart(2, "0");
      const minutesStr = today.getMinutes().toString().padStart(2, "0");
      
      const datetimeLocal = `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
      onChange?.(datetimeLocal);
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const newDate = new Date(dateValue);
    newDate.setHours(hours, minutes, 0, 0);
    
    const year = newDate.getFullYear();
    const month = (newDate.getMonth() + 1).toString().padStart(2, "0");
    const day = newDate.getDate().toString().padStart(2, "0");
    const hoursStr = newDate.getHours().toString().padStart(2, "0");
    const minutesStr = newDate.getMinutes().toString().padStart(2, "0");
    
    const datetimeLocal = `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
    onChange?.(datetimeLocal);
  };

  const handleClear = () => {
    onChange?.("");
    setIsOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleDateSelect}
              captionLayout="dropdown"
              className="rounded-md border-0"
            />
            <div className="flex items-center gap-2 px-3 pb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex gap-2 px-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleClear}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}


