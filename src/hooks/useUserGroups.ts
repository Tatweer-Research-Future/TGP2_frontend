import { useAuth } from "@/context/AuthContext";
import {
  getUserPermissions,
  getUserPermissionsFromGroups,
  canAccessPage,
  canAccessPageFromGroups,
  getHomePage,
  getNavigationItems,
  getNavigationItemsFromGroups,
  inferGroupIdFromGroups,
} from "@/lib/permissions";

export function useUserGroups() {
  const { user } = useAuth();

  // Get group_id from API response or infer from groups array
  const groupId = user?.group_id || inferGroupIdFromGroups(user?.groups || []);
  
  // Check if user has both instructor and attendance_tracker roles
  const hasInstructor = user?.groups?.some(group => 
    group.toLowerCase().includes('instructor') || group.toLowerCase().includes('data')
  ) || false;
  const hasAttendanceTracker = user?.groups?.includes("attendance_tracker") || false;
  
  // Use groups-based permissions if user has multiple roles, otherwise use group_id
  const useGroupsBasedPermissions = hasInstructor && hasAttendanceTracker;
  
  const permissions = useGroupsBasedPermissions 
    ? getUserPermissionsFromGroups(user?.groups || [])
    : getUserPermissions(groupId || undefined);

  return {
    groups: user?.groups || [],
    groupId,
    permissions,
    isInGroup: (groupName: string) =>
      user?.groups?.includes(groupName) || false,
    isAttendanceTracker: hasAttendanceTracker,
    canAccessPage: (page: string) => 
      useGroupsBasedPermissions 
        ? canAccessPageFromGroups(user?.groups || [], page)
        : canAccessPage(groupId || undefined, page),
    getHomePage: () => getHomePage(groupId || undefined),
    getNavigationItems: () => 
      useGroupsBasedPermissions
        ? getNavigationItemsFromGroups(user?.groups || [])
        : getNavigationItems(groupId || undefined),
  };
}
