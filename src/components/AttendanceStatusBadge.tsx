import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface AttendanceStatusBadgeProps {
  checkInTime: string | null;
  checkOutTime: string | null;
  isOnBreak?: boolean;
  breakSince?: string | null;
  className?: string;
}

export function AttendanceStatusBadge({
  checkInTime,
  checkOutTime,
  isOnBreak,
  breakSince,
  className,
}: AttendanceStatusBadgeProps) {
  const { t } = useTranslation();
  if (!checkInTime) {
    return (
      <Badge variant="outline" className={className}>
        {t("pages.attendance.absent")}
      </Badge>
    );
  }

  if (!checkOutTime && isOnBreak) {
    return (
      <Badge
        className={`bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30 ${
          className ?? ""
        }`}
      >
        <span className="inline-block size-2 rounded-full bg-amber-500 dark:bg-amber-400 mr-2" />
        {t("pages.attendance.onBreak", { defaultValue: "On Break" })}
        {breakSince ? (
          <span className="ml-1 text-xs opacity-80">({breakSince})</span>
        ) : null}
      </Badge>
    );
  }

  if (!checkOutTime) {
    return (
      <Badge
        className={`bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30 ${
          className ?? ""
        }`}
      >
        <span className="inline-block size-2 rounded-full bg-green-500 dark:bg-green-400 mr-2" />
        {t("pages.attendance.present")}: {checkInTime}
      </Badge>
    );
  }

  return (
    <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30">
      <span className="inline-block size-2 rounded-full bg-blue-500 dark:bg-blue-400 mr-2" />
      {t("status.completed")}: {checkInTime} - {checkOutTime}
    </Badge>
  );
}
