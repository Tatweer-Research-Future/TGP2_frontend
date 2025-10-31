// Permission system based on group_id
// Based on the user's requirements:
// HR, TECH, PRESENTATION -- 3  (see UserDetailPage and UsersPage only, UserDetailPage home)
// PRESENTATION -- 4 (UserDetailPage and UsersPage only, UserDetailPage home)
// INSTRUCTOR,DATA -- 5 (UserDetailPage and UsersPage and FormsPage only, FormsPage home)
// TRAINEE -- 8 (FormsPage only, is home)
// SUPPORT -- 9 (AttendancePage only, is home)

export type PageRoute =
  | "/home" // HomePage (trainee)
  | "/candidates" // UsersPage
  | "/candidates/:id" // UserDetailPage
  | "/forms" // FormsPage
  | "/forms-results" // FormsResultsPage
  | "/attendance" // AttendancePage
  | "/overview" // DashboardPage
  | "/modules" // My Track (modules list)
  | "/modules/session/:id" // SessionViewPage (read-only)
  | "/modules/session/:id/edit" // SessionEditPage
  | "/modules/:id/exam/create"
  | "/modules/:id/exam/edit"
  | "/modules/:id/exam/results"
  | "/modules/:id/exam/take"
  | "/modules/:moduleId/pre-post-exams/view" // Pre/Post Exam view (module-scoped)
  ; // Pre/Post Exams routes are module-scoped

export type GroupPermissions = {
  allowedPages: PageRoute[];
  homePage: PageRoute;
  groupName: string;
};

// Map group_id to permissions
export const GROUP_PERMISSIONS: Record<number, GroupPermissions> = {
  3: {
    allowedPages: [
      "/home",
      "/candidates",
      "/candidates/:id",
    ],
    homePage: "/candidates/:id", // Will redirect to first candidate or candidates page
    groupName: "HR/TECH/PRESENTATION",
  },
  4: {
    allowedPages: ["/home", "/candidates", "/candidates/:id"],
    homePage: "/candidates/:id", // Will redirect to first candidate or candidates page
    groupName: "PRESENTATION",
  },
  5: {
    allowedPages: [
      "/home",
      "/candidates",
      "/candidates/:id",
      "/forms",
      "/modules",
      "/modules/session/:id",
      "/modules/session/:id/edit",
      "/modules/:id/exam/create",
      "/modules/:id/exam/edit",
      "/modules/:id/exam/results",
      "/modules/:moduleId/pre-post-exams/view",
    ],
    homePage: "/forms",
    groupName: "INSTRUCTOR/DATA",
  },
  8: {
    allowedPages: [
      "/home",
      "/forms",
      "/modules",
      "/modules/session/:id",
      "/modules/:id/exam/take",
    ],
    homePage: "/home",
    groupName: "TRAINEE",
  },
  12: {
    allowedPages: [
      "/home",
      "/forms",
      "/modules",
      "/modules/session/:id",
      "/modules/:id/exam/take",
    ],
    homePage: "/home",
    groupName: "TRAINEE",
  },
  13: {
    allowedPages: [
      "/home",
      "/forms",
      "/modules",
      "/modules/session/:id",
      "/modules/:id/exam/take",
    ],
    homePage: "/home",
    groupName: "TRAINEE",
  },
  14: {
    allowedPages: [
      "/home",
      "/forms",
      "/modules",
      "/modules/session/:id",
      "/modules/:id/exam/take",
    ],
    homePage: "/home",
    groupName: "TRAINEE",
  },
  9: {
    allowedPages: ["/home", "/attendance"],
    homePage: "/attendance",
    groupName: "SUPPORT",
  },
};

/**
 * Get user permissions based on group_id
 */
export function getUserPermissions(
  groupId: number | undefined
): GroupPermissions | null {
  if (!groupId || !GROUP_PERMISSIONS[groupId]) {
    return null;
  }
  return GROUP_PERMISSIONS[groupId];
}

/**
 * Get user permissions based on groups array (for multiple roles)
 */
export function getUserPermissionsFromGroups(
  groups: string[]
): GroupPermissions | null {
  if (!groups || !Array.isArray(groups)) return null;

  const groupMappings: Record<string, number> = {
    hr: 3,
    tech: 3,
    staff: 3,
    presentation: 4,
    instructor: 5,
    data: 5,
    trainee: 8,
    support: 9,
    attendance_tracker: 9,
  };

  // Check if user has both instructor and attendance_tracker roles
  const hasInstructor = groups.some(
    (group) =>
      group.toLowerCase().includes("instructor") ||
      group.toLowerCase().includes("data")
  );
  const hasAttendanceTracker = groups.some(
    (group) =>
      group.toLowerCase().includes("attendance_tracker") ||
      group.toLowerCase().includes("support")
  );

  // If user has both instructor and attendance_tracker roles, combine permissions
  if (hasInstructor && hasAttendanceTracker) {
    return {
      allowedPages: [
        "/candidates",
        "/candidates/:id",
        "/forms",
        "/attendance",
        "/modules",
        "/modules/session/:id",
        "/modules/:id/exam/create",
        "/modules/:id/exam/results",
      ],
      homePage: "/forms", // Default to forms as home for instructor
      groupName: "INSTRUCTOR + ATTENDANCE_TRACKER",
    };
  }

  // Otherwise, use the first matching group (existing behavior)
  for (const group of groups) {
    const lowerGroup = group.toLowerCase();
    for (const [key, id] of Object.entries(groupMappings)) {
      if (lowerGroup.includes(key)) {
        return GROUP_PERMISSIONS[id];
      }
    }
  }

  return null;
}

/**
 * Check if user can access a specific page
 */
export function canAccessPage(
  groupId: number | undefined,
  page: string
): boolean {
  const permissions = getUserPermissions(groupId);
  if (!permissions) return false;

  // Handle dynamic routes like /candidates/:id or /modules/:moduleId/pre-post-exams/view
  return permissions.allowedPages.some((allowedPage) => {
    if (allowedPage === page) return true;

    // Handle dynamic routes with any parameter name (:id, :moduleId, etc.)
    if (allowedPage.includes(":")) {
      const pattern = allowedPage.replace(/:[^/]+/g, "[^/]+");
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(page);
    }

    return false;
  });
}

/**
 * Check if user can access a specific page based on groups array
 */
export function canAccessPageFromGroups(
  groups: string[],
  page: string
): boolean {
  const permissions = getUserPermissionsFromGroups(groups);
  if (!permissions) return false;

  // Handle dynamic routes like /candidates/:id or /modules/:moduleId/pre-post-exams/view
  return permissions.allowedPages.some((allowedPage) => {
    if (allowedPage === page) return true;

    // Handle dynamic routes with any parameter name (:id, :moduleId, etc.)
    if (allowedPage.includes(":")) {
      const pattern = allowedPage.replace(/:[^/]+/g, "[^/]+");
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
    "/home": { title: "navigation.home" },
    "/candidates": { title: "navigation.candidates" },
    "/candidates/:id": { title: "navigation.candidate_detail" }, // Not shown in nav
    "/forms": { title: "navigation.forms" },
    "/forms-results": { title: "navigation.forms_summary" },
    "/attendance": { title: "navigation.attendance" },
    "/overview": { title: "navigation.overview" },
    "/modules": { title: "navigation.my_track" },
    "/modules/session/:id": { title: "navigation.track_session_view" }, // Not shown in nav
    "/modules/session/:id/edit": { title: "navigation.track_session_edit" }, // Not shown in nav
    "/modules/:id/exam/create": { title: "navigation.exam" }, // Not shown in nav
    "/modules/:id/exam/edit": { title: "navigation.exam" }, // Not shown in nav
    "/modules/:id/exam/results": { title: "navigation.exam" }, // Not shown in nav
    "/modules/:id/exam/take": { title: "navigation.exam" }, // Not shown in nav
  };

  return permissions.allowedPages
    .filter(
      (page) =>
        // Don't show dynamic routes in nav
        page !== "/candidates/:id" &&
        page !== "/modules/session/:id" &&
        page !== "/modules/session/:id/edit" &&
        !page.startsWith("/modules/") // hide nested exam routes
    )
    .map((page) => ({
      title: navigationMap[page as PageRoute]?.title || page,
      url: page,
      icon: navigationMap[page as PageRoute]?.icon,
    }));
}

/**
 * Get navigation items based on user groups (for multiple roles)
 */
export function getNavigationItemsFromGroups(groups: string[]): Array<{
  title: string;
  url: string;
  icon?: any;
}> {
  const permissions = getUserPermissionsFromGroups(groups);
  if (!permissions) return [];

  const navigationMap: Record<PageRoute, { title: string; icon?: any }> = {
    "/home": { title: "navigation.home" },
    "/candidates": { title: "navigation.candidates" },
    "/candidates/:id": { title: "navigation.candidate_detail" }, // Not shown in nav
    "/forms": { title: "navigation.forms" },
    "/forms-results": { title: "navigation.forms_summary" },
    "/attendance": { title: "navigation.attendance" },
    "/overview": { title: "navigation.overview" },
    "/modules": { title: "navigation.my_track" },
    "/modules/session/:id": { title: "navigation.track_session_view" }, // Not shown in nav
    "/modules/session/:id/edit": { title: "navigation.track_session_edit" }, // Not shown in nav
    "/modules/:id/exam/create": { title: "navigation.exam" }, // Not shown in nav
    "/modules/:id/exam/edit": { title: "navigation.exam" }, // Not shown in nav
    "/modules/:id/exam/results": { title: "navigation.exam" }, // Not shown in nav
    "/modules/:id/exam/take": { title: "navigation.exam" }, // Not shown in nav
  };

  return permissions.allowedPages
    .filter(
      (page) =>
        // Don't show dynamic routes in nav
        page !== "/candidates/:id" &&
        page !== "/modules/session/:id" &&
        page !== "/modules/session/:id/edit" &&
        !page.startsWith("/modules/") // hide nested exam routes
    )
    .map((page) => ({
      title: navigationMap[page as PageRoute]?.title || page,
      url: page,
      icon: navigationMap[page as PageRoute]?.icon,
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
