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
  
  // Trainee group IDs (8, 12, 13, 14) - these should NOT have instructor permissions
  const traineeGroupIds = [8, 12, 13, 14];
  const isTrainee = groupId !== null && traineeGroupIds.includes(groupId);
  
  // Check if user has instructor roles
  // Must explicitly check for "instructor" in group name, not just "data"
  // (trainee groups like "trainee -> AI & Data Analysis" contain "data" but aren't instructors)
  const hasInstructor = !isTrainee && (
    user?.groups?.some(group => {
      const lowerGroup = group.toLowerCase();
      // Check for explicit instructor pattern (e.g., "instructor -> Data")
      return lowerGroup.includes('instructor') || 
             (lowerGroup.includes('data') && !lowerGroup.includes('trainee'));
    }) || false
  );
  const hasAttendanceTracker = user?.groups?.includes("attendance_tracker") || false;
  
  // Count instructor groups to detect multiple instructor roles
  // Use same logic as hasInstructor to avoid false positives
  const instructorGroups = !isTrainee ? (user?.groups || []).filter(group => {
    const lowerGroup = group.toLowerCase();
    return lowerGroup.includes('instructor') || 
           (lowerGroup.includes('data') && !lowerGroup.includes('trainee'));
  }) : [];
  const hasMultipleInstructorRoles = instructorGroups.length > 1;
  
  // Use groups-based permissions if:
  // 1. User has both instructor and attendance_tracker roles, OR
  // 2. User has multiple instructor roles (admin with multiple tracks)
  const useGroupsBasedPermissions = (hasInstructor && hasAttendanceTracker) || hasMultipleInstructorRoles;
  
  const permissions = useGroupsBasedPermissions 
    ? getUserPermissionsFromGroups(user?.groups || [])
    : getUserPermissions(groupId || undefined);

  const isStaff = user?.is_staff === true;

  return {
    groups: user?.groups || [],
    groupId,
    permissions,
    isStaff,
    isTrainee,
    hasInstructor,
    isInGroup: (groupName: string) =>
      user?.groups?.includes(groupName) || false,
    isAttendanceTracker: hasAttendanceTracker,
    canAccessPage: (page: string) => 
      useGroupsBasedPermissions
        ? canAccessPageFromGroups(user?.groups || [], page, isStaff)
        : canAccessPage(groupId || undefined, page, isStaff),
    getHomePage: () => {
      if (useGroupsBasedPermissions) {
        const perms = getUserPermissionsFromGroups(user?.groups || []);
        return perms?.homePage || getHomePage(groupId || undefined);
      }
      return getHomePage(groupId || undefined);
    },
    getNavigationItems: () => 
      useGroupsBasedPermissions
        ? getNavigationItemsFromGroups(user?.groups || [], isStaff)
        : getNavigationItems(groupId || undefined, isStaff),
  };
}
