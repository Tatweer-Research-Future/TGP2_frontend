import { useEffect, useState } from "react";
import { getAnnouncements, type Announcement } from "@/lib/api";

/**
 * Checks if the most recent announcement was published in the last 24 hours
 * @returns boolean indicating if there are new announcements (< 24 hours old)
 */
export function useNewAnnouncements(): boolean {
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);

  useEffect(() => {
    async function checkForNewAnnouncements() {
      try {
        const response = await getAnnouncements();
        const announcements = response.results || [];
        
        if (announcements.length === 0) {
          setHasNewAnnouncements(false);
          return;
        }

        // Filter out disabled and expired announcements
        const activeAnnouncements = announcements.filter((announcement: Announcement) => {
          if (announcement.is_disabled) return false;
          
          const now = new Date();
          if (announcement.expire_at) {
            const expireDate = new Date(announcement.expire_at);
            if (expireDate < now) return false;
          }
          
          return true;
        });

        if (activeAnnouncements.length === 0) {
          setHasNewAnnouncements(false);
          return;
        }

        // Get the most recent announcement (sort by publish_at descending)
        const sortedAnnouncements = [...activeAnnouncements].sort((a, b) => {
          const dateA = new Date(a.publish_at).getTime();
          const dateB = new Date(b.publish_at).getTime();
          return dateB - dateA;
        });

        const mostRecent = sortedAnnouncements[0];
        const now = new Date();
        const publishDate = new Date(mostRecent.publish_at);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Check if most recent announcement is less than 24 hours old
        const isNew = publishDate >= twentyFourHoursAgo && publishDate <= now;
        
        setHasNewAnnouncements(isNew);
      } catch (error) {
        console.error("Failed to check for new announcements:", error);
        setHasNewAnnouncements(false);
      }
    }

    // Check immediately on page load/refresh
    checkForNewAnnouncements();

    // Check every 5 minutes to catch new announcements
    const interval = setInterval(checkForNewAnnouncements, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return hasNewAnnouncements;
}

