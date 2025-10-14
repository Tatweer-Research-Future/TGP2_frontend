import { useAuth } from "@/context/AuthContext";

export function useUserGroups() {
  const { user } = useAuth();
  
  return {
    groups: user?.groups || [],
    isInGroup: (groupName: string) => user?.groups?.includes(groupName) || false,
    isAttendanceTracker: user?.groups?.includes('attendance_tracker') || false,
  };
}


