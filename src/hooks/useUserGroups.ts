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
  
  // Check if user has instructor roles
  const hasInstructor = user?.groups?.some(group => 
    group.toLowerCase().includes('instructor') || group.toLowerCase().includes('data')
  ) || false;
  const hasAttendanceTracker = user?.groups?.includes("attendance_tracker") || false;
  
  // Count instructor groups to detect multiple instructor roles
  const instructorGroups = (user?.groups || []).filter(group => 
    group.toLowerCase().includes('instructor') || group.toLowerCase().includes('data')
  );
  const hasMultipleInstructorRoles = instructorGroups.length > 1;
  
  // Use groups-based permissions if:
  // 1. User has both instructor and attendance_tracker roles, OR
  // 2. User has multiple instructor roles (admin with multiple tracks)
  const useGroupsBasedPermissions = (hasInstructor && hasAttendanceTracker) || hasMultipleInstructorRoles;
  
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
    getHomePage: () => {
      if (useGroupsBasedPermissions) {
        const perms = getUserPermissionsFromGroups(user?.groups || []);
        return perms?.homePage || getHomePage(groupId || undefined);
      }
      return getHomePage(groupId || undefined);
    },
    getNavigationItems: () => 
      useGroupsBasedPermissions
        ? getNavigationItemsFromGroups(user?.groups || [])
        : getNavigationItems(groupId || undefined),
  };
}
