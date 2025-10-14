import { Badge } from "@/components/ui/badge";

interface AttendanceStatusBadgeProps {
  checkInTime: string | null;
  checkOutTime: string | null;
  className?: string;
}

export function AttendanceStatusBadge({
  checkInTime,
  checkOutTime,
  className,
}: AttendanceStatusBadgeProps) {
  if (!checkInTime) {
    return (
      <Badge variant="outline" className={className}>
        Not Checked In
      </Badge>
    );
  }

  if (!checkOutTime) {
    return (
      <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30">
        <span className="inline-block size-2 rounded-full bg-green-500 dark:bg-green-400 mr-2" />
        Checked In: {checkInTime}
      </Badge>
    );
  }

  return (
    <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30">
      <span className="inline-block size-2 rounded-full bg-blue-500 dark:bg-blue-400 mr-2" />
      Complete: {checkInTime} - {checkOutTime}
    </Badge>
  );
}


