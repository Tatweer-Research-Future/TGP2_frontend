import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TimePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTimeSelect: (time: string) => void;
  title?: string;
  description?: string;
  defaultTime?: string;
  defaultAM?: boolean; // true for AM, false for PM
}

export function TimePickerDialog({
  open,
  onOpenChange,
  onTimeSelect,
  title = "Select Time",
  description = "Choose a specific time for this action.",
  defaultTime,
  defaultAM = true,
}: TimePickerDialogProps) {
  const [time, setTime] = useState(defaultTime || "");
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [isAM, setIsAM] = useState(defaultAM);

  // Initialize from defaultTime or current time
  useEffect(() => {
    if (defaultTime) {
      const [h, m] = defaultTime.split(':').map(Number);
      setHours(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinutes(m);
      setIsAM(h < 12);
    } else {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      setHours(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinutes(m);
      setIsAM(defaultAM);
    }
  }, [defaultTime, open, defaultAM]);

  // Update time string when hours/minutes/AM-PM changes
  useEffect(() => {
    const h24 = isAM ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
    const timeString = `${h24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    setTime(timeString);
  }, [hours, minutes, isAM]);

  const handleHourClick = (hour: number) => {
    setHours(hour);
  };

  const handleMinuteClick = (minute: number) => {
    setMinutes(minute);
  };

  const handleDirectTimeInput = (value: string) => {
    setTime(value);
    if (!value) return;

    const timePattern = /^(\d{1,2}):(\d{2})$/;
    const match = value.match(timePattern);
    if (!match) return;

    const parsedHours = Number(match[1]);
    const parsedMinutes = Number(match[2]);

    if (
      Number.isNaN(parsedHours) ||
      Number.isNaN(parsedMinutes) ||
      parsedHours < 0 ||
      parsedHours > 23 ||
      parsedMinutes < 0 ||
      parsedMinutes > 59
    ) {
      return;
    }

    const hours12 =
      parsedHours === 0 ? 12 : parsedHours > 12 ? parsedHours - 12 : parsedHours;

    setHours(hours12);
    setMinutes(parsedMinutes);
    setIsAM(parsedHours < 12);
  };

  const handleSubmit = () => {
    if (time) {
      onTimeSelect(time);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Generate hour positions (1-12)
  const hourPositions = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minute positions (0, 5, 10, 15, etc.)
  const minutePositions = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Clock Face */}
          <div className="relative w-64 h-64 border-4 border-border rounded-full bg-card shadow-lg">
            {/* Hour markers */}
            {hourPositions.map((hour) => {
              const angle = (hour - 3) * 30; // Start from 12 o'clock
              const x = 128 + 100 * Math.cos((angle * Math.PI) / 180);
              const y = 128 + 100 * Math.sin((angle * Math.PI) / 180);
              return (
                <button
                  key={hour}
                  onClick={() => handleHourClick(hour)}
                  className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transform -translate-x-1/2 -translate-y-1/2 transition-colors ${
                    hours === hour
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                  }`}
                  style={{ left: x, top: y }}
                >
                  {hour}
                </button>
              );
            })}
            
            {/* Minute markers */}
            {minutePositions.map((minute) => {
              const angle = (minute - 15) * 6; // Start from 12 o'clock
              const x = 128 + 80 * Math.cos((angle * Math.PI) / 180);
              const y = 128 + 80 * Math.sin((angle * Math.PI) / 180);
              return (
                <button
                  key={minute}
                  onClick={() => handleMinuteClick(minute)}
                  className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-xs transform -translate-x-1/2 -translate-y-1/2 transition-colors ${
                    minutes === minute
                      ? 'bg-green-600 text-white'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                  style={{ left: x, top: y }}
                >
                  {minute}
                </button>
              );
            })}
            
            {/* Center dot */}
            <div className="absolute w-4 h-4 bg-foreground rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: 128, top: 128 }} />
          </div>

          {/* AM/PM Toggle */}
          <div className="flex gap-2">
            <Button
              variant={isAM ? "default" : "outline"}
              onClick={() => setIsAM(true)}
              size="sm"
            >
              AM
            </Button>
            <Button
              variant={!isAM ? "default" : "outline"}
              onClick={() => setIsAM(false)}
              size="sm"
            >
              PM
            </Button>
          </div>

          {/* Current Selection Display (editable) */}
          <div className="w-full flex justify-center">
            <Input
              type="time"
              step="60"
              value={time}
              onChange={(event) => handleDirectTimeInput(event.target.value)}
              className="text-lg font-mono w-40 text-center time-input-display"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!time}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


