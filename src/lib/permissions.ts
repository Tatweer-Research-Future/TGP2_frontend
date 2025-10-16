// Permission system based on group_id
// Based on the user's requirements:
// HR, TECH, PRESENTATION -- 3  (see UserDetailPage and UsersPage only, UserDetailPage home)
// PRESENTATION -- 4 (UserDetailPage and UsersPage only, UserDetailPage home)
// INSTRUCTOR,DATA -- 5 (UserDetailPage and UsersPage and FormsPage only, FormsPage home)
// TRAINEE -- 8 (FormsPage only, is home)
// SUPPORT -- 9 (AttendancePage only, is home)

export type PageRoute =
  | "/candidates" // UsersPage
  | "/candidates/:id" // UserDetailPage
  | "/forms" // FormsPage
  | "/attendance" // AttendancePage
  | "/overview"; // DashboardPage

export type GroupPermissions = {
  allowedPages: PageRoute[];
  homePage: PageRoute;
  groupName: string;
};

// Map group_id to permissions
export const GROUP_PERMISSIONS: Record<number, GroupPermissions> = {
  3: {
    allowedPages: ["/candidates", "/candidates/:id"],
    homePage: "/candidates/:id", // Will redirect to first candidate or candidates page
    groupName: "HR/TECH/PRESENTATION",
  },
  4: {
    allowedPages: ["/candidates", "/candidates/:id"],
    homePage: "/candidates/:id", // Will redirect to first candidate or candidates page
    groupName: "PRESENTATION",
  },
  5: {
    allowedPages: ["/candidates", "/candidates/:id", "/forms"],
    homePage: "/forms",
    groupName: "INSTRUCTOR/DATA",
  },
  8: {
    allowedPages: ["/forms"],
    homePage: "/forms",
    groupName: "TRAINEE",
  },
  9: {
    allowedPages: ["/attendance"],
    homePage: "/attendance",
    groupName: "SUPPORT",
  },
};

/**
 * Get user permissions based on group_id
 */
export function getUserPermissions(groupId: number | undefined): GroupPermissions | null {
  if (!groupId || !GROUP_PERMISSIONS[groupId]) {
    return null;
  }
  return GROUP_PERMISSIONS[groupId];
}

/**
 * Check if user can access a specific page
 */
export function canAccessPage(groupId: number | undefined, page: string): boolean {
  const permissions = getUserPermissions(groupId);
  if (!permissions) return false;

  // Handle dynamic routes like /candidates/:id
  return permissions.allowedPages.some((allowedPage) => {
    if (allowedPage === page) return true;

    // Handle dynamic routes
    if (allowedPage.includes(":id")) {
      const pattern = allowedPage.replace(":id", "[^/]+");
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(page);
    }

    return false;
  });
}

/**
 * Get the home page for a user based on group_id
 */
export function getHomePage(groupId: number | undefined): string {
  const permissions = getUserPermissions(groupId);
  if (!permissions) return "/candidates"; // fallback

  // For groups 3 and 4, we need to redirect to candidates list initially
  // since we can't know the specific candidate ID
  if (groupId === 3 || groupId === 4) {
    return "/candidates";
  }

  return permissions.homePage;
}

/**
 * Get navigation items based on user permissions
 */
export function getNavigationItems(groupId: number | undefined): Array<{
  title: string;
  url: string;
  icon?: any;
}> {
  const permissions = getUserPermissions(groupId);
  if (!permissions) return [];

  const navigationMap: Record<PageRoute, { title: string; icon?: any }> = {
    "/candidates": { title: "navigation.candidates" },
    "/candidates/:id": { title: "navigation.candidate_detail" }, // Not shown in nav
    "/forms": { title: "navigation.forms" },
    "/attendance": { title: "navigation.attendance" },
    "/overview": { title: "navigation.overview" },
  };

  return permissions.allowedPages
    .filter((page) => page !== "/candidates/:id") // Don't show dynamic routes in nav
    .map((page) => ({
      title: navigationMap[page]?.title || page,
      url: page,
      icon: navigationMap[page]?.icon,
    }));
}

/**
 * Fallback: Try to determine group_id from groups string array
 * This is a temporary solution until we confirm the API returns group_id
 */
export function inferGroupIdFromGroups(groups: string[]): number | null {
  if (!groups || !Array.isArray(groups)) return null;

  // Map common group names to group IDs
  const groupMappings: Record<string, number> = {
    hr: 3,
    tech: 3,
    presentation: 4,
    instructor: 5,
    data: 5,
    trainee: 8,
    support: 9,
    attendance_tracker: 9,
  };

  // Check each group string for known patterns
  for (const group of groups) {
    const lowerGroup = group.toLowerCase();

    // Direct matches
    for (const [key, id] of Object.entries(groupMappings)) {
      if (lowerGroup.includes(key)) {
        return id;
      }
    }
  }

  return null;
}
