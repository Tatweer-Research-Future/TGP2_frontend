import { useAuth } from "@/context/AuthContext";
import {
  getUserPermissions,
  canAccessPage,
  getHomePage,
  getNavigationItems,
  inferGroupIdFromGroups,
} from "@/lib/permissions";

export function useUserGroups() {
  const { user } = useAuth();

  // Get group_id from API response or infer from groups array
  const groupId = user?.group_id || inferGroupIdFromGroups(user?.groups || []);
  const permissions = getUserPermissions(groupId);

  return {
    groups: user?.groups || [],
    groupId,
    permissions,
    isInGroup: (groupName: string) =>
      user?.groups?.includes(groupName) || false,
    isAttendanceTracker: user?.groups?.includes("attendance_tracker") || false,
    canAccessPage: (page: string) => canAccessPage(groupId, page),
    getHomePage: () => getHomePage(groupId),
    getNavigationItems: () => getNavigationItems(groupId),
  };
}
