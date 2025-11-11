import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getAnnouncements,
  getPolls,
  voteOnPoll,
  getAnnouncementReactions,
  addAnnouncementReaction,
  removeAnnouncementReaction,
  createAnnouncement,
  createInstructorAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getPortalTracks,
  type Announcement,
  type Poll,
  type ReactionCount,
  type PortalTrack,
} from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBell, IconChartBar, IconPlus, IconEdit, IconTrash, IconTrophy, IconMedal } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

function isNewAnnouncement(publishDate: string): boolean {
  const now = new Date();
  const publish = new Date(publishDate);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return publish >= twentyFourHoursAgo && publish <= now;
}

// Common reaction emojis users can choose from
const COMMON_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "👎", label: "Dislike" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Funny" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "🙌", label: "Celebrate" },
  { emoji: "💯", label: "Perfect" },
  { emoji: "✅", label: "Correct" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😠", label: "Angry" },
  { emoji: "🔥", label: "Fire" },
];

function AnnouncementCard({ 
  announcement, 
  onEdit, 
  onDelete,
  canEdit,
  currentUserId,
  isStaffUser,
}: { 
  announcement: Announcement;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (id: number) => void;
  canEdit?: boolean;
  currentUserId?: number;
  isStaffUser?: boolean;
}) {
  const { t } = useTranslation();
  const isNew = isNewAnnouncement(announcement.publish_at);
  const [reactionCounts, setReactionCounts] = useState<ReactionCount[]>([]);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(true);
  const [isReacting, setIsReacting] = useState(false);
  const [showAddReactions, setShowAddReactions] = useState(false);

  // Fetch reactions on mount
  useEffect(() => {
    async function loadReactions() {
      try {
        const response = await getAnnouncementReactions(announcement.id);
        setReactionCounts(response.counts);
        setMyReactions(response.my_reactions);
      } catch (err) {
        console.error("Failed to load reactions:", err);
        // Silently fail - reactions are optional
      } finally {
        setIsLoadingReactions(false);
      }
    }
    loadReactions();
  }, [announcement.id]);

  const handleReactionToggle = async (reaction: string) => {
    if (isReacting) return;

    const isCurrentlyReacted = myReactions.includes(reaction);
    setIsReacting(true);

    try {
      if (isCurrentlyReacted) {
        // Remove reaction
        const response = await removeAnnouncementReaction(announcement.id, {
          reaction,
        });
        setReactionCounts(response.counts);
        setMyReactions(response.my_reactions);
      } else {
        // Add reaction
        const response = await addAnnouncementReaction(announcement.id, {
          reaction,
        });
        setReactionCounts(response.counts);
        setMyReactions(response.my_reactions);
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
      toast.error(
        t("pages.home.reactionError", {
          defaultValue: "Failed to update reaction",
        })
      );
    } finally {
      setIsReacting(false);
    }
  };

  // Get count for a specific reaction
  const getReactionCount = (reaction: string): number => {
    const count = reactionCounts.find((r) => r.reaction === reaction);
    return count?.count || 0;
  };

  // Get reactions with count > 0 (visible reactions)
  // Always include "💯" (Perfect) reaction
  const perfectEmoji = "💯";
  const visibleReactionsFromCounts = reactionCounts
    .filter((r) => r.count > 0)
    .map((r) => r.reaction);
  
  // Ensure "💯" is always visible
  const visibleReactions = [
    ...new Set([...visibleReactionsFromCounts, perfectEmoji]),
  ];

  // Get all reactions that exist but aren't visible (count = 0)
  const hiddenReactionsFromAPI = reactionCounts
    .filter((r) => r.count === 0)
    .map((r) => ({
      emoji: r.reaction,
      label: COMMON_REACTIONS.find((cr) => cr.emoji === r.reaction)?.label || r.reaction,
    }));

  // Get all common reactions that aren't in visible reactions
  const availableCommonReactions = COMMON_REACTIONS.filter(
    (r) => !visibleReactions.includes(r.emoji)
  );

  // Combine hidden API reactions and available common reactions
  const availableReactions = [
    ...hiddenReactionsFromAPI,
    ...availableCommonReactions.filter(
      (r) => !hiddenReactionsFromAPI.some((hr) => hr.emoji === r.emoji)
    ),
  ];

  // Handle adding a new reaction (from the add panel)
  const handleAddReaction = async (reaction: string) => {
    await handleReactionToggle(reaction);
    // Close the add panel after adding
    setShowAddReactions(false);
  };

  return (
    <Card
      className={cn(
        "border-l-4",
        isNew
          ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/10"
          : "border-l-blue-500"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 relative">
            <IconBell
              className={cn(
                "w-5 h-5",
                isNew ? "text-green-500" : "text-blue-500"
              )}
            />
            {isNew && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg">
                  {announcement.title}
                </h3>
                {isNew && (
                  <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 shrink-0 animate-pulse">
                    NEW
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-sm">
                  {formatDate(announcement.publish_at)}
                </Badge>
                {/* Show edit/delete buttons only if:
                    - User is staff (can edit/delete all), OR
                    - User is instructor AND created this announcement */}
                {canEdit && (isStaffUser || (currentUserId && announcement.created_by === currentUserId)) && (
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(announcement)}
                        title={t("common.edit", { defaultValue: "Edit" })}
                      >
                        <IconEdit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(t("common.confirmDelete", { defaultValue: "Are you sure you want to delete this announcement?" }))) {
                            onDelete(announcement.id);
                          }
                        }}
                        title={t("common.delete", { defaultValue: "Delete" })}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-base text-muted-foreground whitespace-pre-wrap break-words">
              {announcement.body}
            </p>

            {/* Reaction Buttons */}
            {!isLoadingReactions && (
              <div className="mt-3 pt-3 border-t border-border/50">
                {/* Visible reactions (count > 1) */}
                <div className="flex items-center gap-1 flex-wrap">
                  {visibleReactions.map((reaction) => {
                    const count = getReactionCount(reaction);
                    const isReacted = myReactions.includes(reaction);
                    const reactionLabel =
                      COMMON_REACTIONS.find((r) => r.emoji === reaction)?.label ||
                      reaction;

                    return (
                      <button
                        key={reaction}
                        onClick={() => handleReactionToggle(reaction)}
                        disabled={isReacting}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors",
                          "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
                          isReacted
                            ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                            : "border border-transparent"
                        )}
                        title={reactionLabel}
                      >
                        <span className="text-lg">{reaction}</span>
                        {count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Add Reaction Button */}
                  <button
                    onClick={() => setShowAddReactions(!showAddReactions)}
                    className={cn(
                      "flex items-center justify-center px-2 py-1 rounded-md text-sm transition-colors",
                      "hover:bg-muted border border-border",
                      showAddReactions && "bg-muted"
                    )}
                    title={t("pages.home.addReaction", {
                      defaultValue: "Add reaction",
                    })}
                  >
                    <img
                      src="/assets/svg/reaction-emoji-add.svg"
                      alt="Add reaction"
                      className="w-5 h-5 opacity-50 dark:opacity-60 dark:invert"
                    />
                  </button>
                </div>

                {/* Add Reaction Panel (shown when button is clicked) */}
                {showAddReactions && availableReactions.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30 flex-wrap">
                    {availableReactions.map((reaction) => {
                      const isReacted = myReactions.includes(reaction.emoji);
                      const count = getReactionCount(reaction.emoji);
                      
                      return (
                        <button
                          key={reaction.emoji}
                          onClick={() => handleAddReaction(reaction.emoji)}
                          disabled={isReacting}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors",
                            "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
                            isReacted
                              ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                              : "border border-transparent"
                          )}
                          title={reaction.label}
                        >
                          <span className="text-lg">{reaction.emoji}</span>
                          {count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PollCard({ poll, onVote }: { poll: Poll; onVote: (pollId: number, choiceId: number) => void }) {
  const { t } = useTranslation();
  const [selectedChoice, setSelectedChoice] = useState<number | null>(poll.my_vote_choice_id);
  const [isVoting, setIsVoting] = useState(false);
  const totalVotes = poll.choices.reduce((sum, choice) => sum + choice.votes, 0);

  const handleVote = async (choiceId: number) => {
    if (poll.my_vote_choice_id !== null || isVoting || selectedChoice === choiceId) return;
    
    setIsVoting(true);
    setSelectedChoice(choiceId);
    
    try {
      await voteOnPoll(poll.id, { choice: choiceId });
      toast.success(t("pages.home.pollVoted", { defaultValue: "Vote submitted!" }));
      onVote(poll.id, choiceId);
    } catch (err) {
      toast.error(t("pages.home.pollVoteError", { defaultValue: "Failed to submit vote" }));
      setSelectedChoice(poll.my_vote_choice_id);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <IconChartBar className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-base sm:text-lg">{poll.question}</h3>
            </div>
            
            <div className="space-y-2">
              {poll.choices.map((choice) => {
                const percentage = totalVotes > 0 ? (choice.votes / totalVotes) * 100 : 0;
                const isSelected = selectedChoice === choice.id || poll.my_vote_choice_id === choice.id;
                const canVote = poll.my_vote_choice_id === null;

                return (
                  <div
                    key={choice.id}
                    className="relative"
                  >
                    {totalVotes > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-purple-200 dark:bg-purple-700/60 rounded-md transition-all duration-300 z-0"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                    <button
                      onClick={() => handleVote(choice.id)}
                      disabled={!canVote || isVoting}
                      className={`relative w-full text-left px-3 py-2 rounded-md border transition-all z-10 ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30"
                          : canVote
                          ? "border-border hover:border-purple-300 hover:bg-muted/50"
                          : "border-border opacity-60 cursor-not-allowed"
                      } ${isVoting ? "cursor-wait" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-medium">{choice.text}</span>
                        {isSelected && (
                          <span className="text-sm text-purple-600 dark:text-purple-400">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {choice.votes} {choice.votes === 1 ? "vote" : "votes"} ({percentage.toFixed(0)}%)
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            
            {totalVotes > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {totalVotes} {totalVotes === 1 ? "total vote" : "total votes"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const { groupId, isStaff, hasInstructor } = useUserGroups();
  const { user } = useAuth();
  
  // Ensure we have valid boolean values
  const isStaffUser = Boolean(isStaff);
  const isInstructorUser = Boolean(hasInstructor);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [tracks, setTracks] = useState<PortalTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  
  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formScope, setFormScope] = useState<"GLOBAL" | "TRACK">("TRACK");
  const [formTrack, setFormTrack] = useState<string>("");
  const [formPublishAt, setFormPublishAt] = useState("");
  const [formExpireAt, setFormExpireAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load tracks for staff/instructors only
  useEffect(() => {
    if (isStaffUser || isInstructorUser) {
      setIsLoadingTracks(true);
      getPortalTracks()
        .then((data) => {
          setTracks(data.results || []);
        })
        .catch((err) => {
          console.error("Failed to load tracks:", err);
        })
        .finally(() => {
          setIsLoadingTracks(false);
        });
    }
  }, [isStaffUser, isInstructorUser]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        console.log("Loading announcements and polls...");
        console.log("User group ID:", groupId);
        const [announcementsData, pollsData] = await Promise.all([
          getAnnouncements(),
          getPolls({ group: groupId?.toString() }),
        ]);
        console.log("Announcements data:", announcementsData);
        console.log("Polls data:", pollsData);
        setAnnouncements(announcementsData.results || []);
        setPolls(pollsData || []);
      } catch (err) {
        console.error("Failed to load home data:", err);
        toast.error(t("pages.home.loadError", { defaultValue: "Failed to load content" }));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [t, groupId]);

  // Only staff and instructors can create/edit/delete announcements
  // Trainees are read-only and should not see these buttons
  const canEditAnnouncements = isStaffUser || isInstructorUser;

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setFormTitle("");
    setFormBody("");
    setFormScope(isStaff ? "GLOBAL" : "TRACK");
    setFormTrack("");
    setFormPublishAt(new Date().toISOString().slice(0, 16));
    setFormExpireAt("");
    setShowAnnouncementDialog(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormTitle(announcement.title);
    setFormBody(announcement.body);
    setFormScope(announcement.scope);
    setFormTrack(announcement.track?.toString() || "");
    setFormPublishAt(announcement.publish_at.slice(0, 16));
    setFormExpireAt(announcement.expire_at ? announcement.expire_at.slice(0, 16) : "");
    setShowAnnouncementDialog(true);
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      toast.success(t("pages.home.announcementDeleted", { defaultValue: "Announcement deleted" }));
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      toast.error(t("pages.home.announcementDeleteError", { defaultValue: "Failed to delete announcement" }));
    }
  };

  const handleSubmitAnnouncement = async () => {
    if (!formTitle.trim() || !formBody.trim() || !formPublishAt) {
      toast.error(t("pages.home.fillRequiredFields", { defaultValue: "Please fill all required fields" }));
      return;
    }

    if (formScope === "TRACK" && isStaffUser && !formTrack) {
      toast.error(t("pages.home.selectTrack", { defaultValue: "Please select a track" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const publishAt = new Date(formPublishAt).toISOString();
      const expireAt = formExpireAt ? new Date(formExpireAt).toISOString() : null;

      if (editingAnnouncement) {
        // Update existing announcement
        const payload: any = {
          title: formTitle,
          body: formBody,
          publish_at: publishAt,
          expire_at: expireAt,
        };
        
        if (isStaffUser) {
          payload.scope = formScope;
          if (formScope === "TRACK") {
            payload.track = parseInt(formTrack);
          }
        }

        const updated = await updateAnnouncement(editingAnnouncement.id, payload);
        toast.success(t("pages.home.announcementUpdated", { defaultValue: "Announcement updated" }));
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
      } else {
        // Create new announcement
        if (isInstructorUser && !isStaffUser) {
          // Use instructor endpoint
          const payload: any = {
            title: formTitle,
            body: formBody,
            publish_at: publishAt,
            expire_at: expireAt,
          };
          
          // Only include track if instructor trains multiple tracks
          if (formTrack) {
            payload.track = parseInt(formTrack);
          }

          const created = await createInstructorAnnouncement(payload);
          toast.success(t("pages.home.announcementCreated", { defaultValue: "Announcement created" }));
          setAnnouncements((prev) => [created, ...prev]);
        } else {
          // Staff uses regular endpoint
          const payload: any = {
            title: formTitle,
            body: formBody,
            scope: formScope,
            publish_at: publishAt,
            expire_at: expireAt,
          };
          
          if (formScope === "TRACK") {
            payload.track = parseInt(formTrack);
          }

          const created = await createAnnouncement(payload);
          toast.success(t("pages.home.announcementCreated", { defaultValue: "Announcement created" }));
          setAnnouncements((prev) => [created, ...prev]);
        }
      }
      setShowAnnouncementDialog(false);
    } catch (err: any) {
      console.error("Failed to save announcement:", err);
      toast.error(
        err?.data?.detail || 
        t("pages.home.announcementSaveError", { defaultValue: "Failed to save announcement" })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePollVote = (pollId: number, choiceId: number) => {
    setPolls((prevPolls) =>
      prevPolls.map((poll) => {
        if (poll.id === pollId) {
          return {
            ...poll,
            my_vote_choice_id: choiceId,
            choices: poll.choices.map((choice) => ({
              ...choice,
              votes: choice.id === choiceId ? choice.votes + 1 : choice.votes,
            })),
          };
        }
        return poll;
      })
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader />
        </div>
      </div>
    );
  }

  const hasContent = announcements.length > 0 || polls.length > 0;

  // Map track names to colors (matching TrackPage.tsx)
  function getTrackTheme(trackName?: string) {
    const name = (trackName || "").toLowerCase();
    if (name.includes("ai") || name.includes("data")) {
      return {
        gradient: "bg-gradient-to-br from-[#34d399] via-[#06b6d4] to-[#3b82f6]",
        border: "border-[#34d399]",
        borderColor: "#34d399",
        ring: "ring-[#34d399]/50",
        glow: "shadow-[#34d399]/50",
        badge: "bg-[#34d399]/20 dark:bg-[#34d399]/30 text-[#34d399] dark:text-[#34d399]",
        text: "text-[#34d399] dark:text-[#34d399]",
      };
    }
    if (
      name.includes("software") ||
      name.includes("app") ||
      name.includes("development")
    ) {
      return {
        gradient: "bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#d946ef]",
        border: "border-[#6366f1]",
        borderColor: "#6366f1",
        ring: "ring-[#6366f1]/50",
        glow: "shadow-[#6366f1]/50",
        badge: "bg-[#6366f1]/20 dark:bg-[#6366f1]/30 text-[#6366f1] dark:text-[#6366f1]",
        text: "text-[#6366f1] dark:text-[#6366f1]",
      };
    }
    if (name.includes("network") || name.includes("communication")) {
      return {
        gradient: "bg-gradient-to-br from-[#0ea5e9] via-[#22d3ee] to-[#34d399]",
        border: "border-[#0ea5e9]",
        borderColor: "#0ea5e9",
        ring: "ring-[#0ea5e9]/50",
        glow: "shadow-[#0ea5e9]/50",
        badge: "bg-[#0ea5e9]/20 dark:bg-[#0ea5e9]/30 text-[#0ea5e9] dark:text-[#0ea5e9]",
        text: "text-[#0ea5e9] dark:text-[#0ea5e9]",
      };
    }
    // Fallback
    return {
      gradient: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      border: "border-yellow-400",
      borderColor: "#eab308",
      ring: "ring-yellow-400/50",
      glow: "shadow-yellow-500/50",
      badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
      text: "text-yellow-700 dark:text-yellow-300",
    };
  }

  // Hardcoded leaderboard data for past week
  const leaderboardData = [
    {
      track: "Software & App Development",
      trackAr: "تطوير البرمجيات والتطبيقات",
      name: "Abdulrauf Ibrahim Elbahloul",
      nameAr: "عبد الرؤوف إبراهيم البهلول",
      email: "abdoelbahloul434@gmail.com",
      image: "/assets/TraineePictures/عبد الرؤوف إبراهيم البهلول.png",
    },
    {
      track: "AI & Data Analysis",
      trackAr: "الذكاء الاصطناعي وتحليل البيانات",
      name: "Raghad Mohammed Saleh Bushiha",
      nameAr: "رغد محمد صالح بوشيحة",
      email: "raghadbushiha@gmail.com",
      image: "/assets/TraineePictures/رغد محمد صالح بوشيحة.png",
    },
    {
      track: "Networking & Telecommunications",
      trackAr: "الشبكات والاتصالات",
      name: "Ibrahim safi Abdullah hammoda",
      nameAr: "ابراهيم صافي عبدالله حموده",
      email: "ibrahimalsafi98@gmail.com",
      image: "/assets/TraineePictures/ابراهيم صافي عبدالله حموده.png",
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold">
          {t("pages.home.title", { defaultValue: "Home" })}
        </h1>
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <IconTrophy className="w-5 h-5 text-yellow-500" />
          {t("pages.home.leaderboard", { defaultValue: "Leaderboard - Best of the Week" })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaderboardData.map((winner, index) => {
            // Get track-specific theme colors
            const trackTheme = getTrackTheme(winner.track);
            
            return (
              <Card 
                key={index} 
                className={cn(
                  "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
                  "ring-2",
                  trackTheme.ring
                )}
              >
                {/* Confetti effect for all winners */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                  {[...Array(30)].map((_, i) => {
                    const colors = ["bg-yellow-400", "bg-red-400", "bg-blue-400", "bg-green-400", "bg-purple-400", "bg-pink-400"];
                    const color = colors[i % colors.length];
                    const size = Math.random() * 4 + 2;
                    const left = Math.random() * 100;
                    const delay = Math.random() * 2;
                    const duration = Math.random() * 2 + 1;
                    
                    return (
                      <div
                        key={i}
                        className={cn("absolute rounded-full", color)}
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          left: `${left}%`,
                          top: "-10px",
                          animation: `confetti-fall ${duration}s ${delay}s infinite`,
                          opacity: 0.8,
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* Shine effect */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                  style={{
                    animation: "shine 3s infinite",
                    transform: "translateX(-100%)",
                  }}
                />
                
                <CardContent className="p-5 relative z-10">
                  <div className="flex flex-col items-center text-center gap-4">
                    {/* Winner's picture */}
                    <div className="relative">
                      <div 
                        className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-lg"
                        style={{ borderColor: trackTheme.borderColor }}
                      >
                        <img
                          src={winner.image}
                          alt={winner.name}
                          className="w-full h-full object-cover"
                          style={{ 
                            objectPosition: "center 35%",
                            transform: "scale(1.1)"
                          }}
                        />
                      </div>
                      {/* Trophy icon overlay */}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-background",
                        trackTheme.gradient,
                        trackTheme.glow
                      )}>
                        <IconTrophy className="w-5 h-5 text-white" />
                      </div>
                      {/* Position emoji badge - all are 1st place */}
                      <div className="absolute top-0 right-0 text-2xl animate-bounce z-10">
                        🥇
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="mb-2">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs mb-2 font-semibold", trackTheme.badge)}
                        >
                          {winner.track}
                        </Badge>
                        <h3 className={cn("font-bold text-lg mt-2", trackTheme.text)}>
                          {winner.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">
                          {winner.nameAr}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {!hasContent && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t("pages.home.noContent", { defaultValue: "No announcements or polls available" })}
            </p>
          </CardContent>
        </Card>
      )}

      {announcements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <IconBell className="w-5 h-5 text-purple-500" />
              {t("pages.home.announcements", { defaultValue: "Announcements" })}
            </h2>
            {canEditAnnouncements && (
              <Button onClick={handleCreateAnnouncement} size="sm">
                <IconPlus className="h-4 w-4 mr-2" />
                {t("pages.home.createAnnouncement", { defaultValue: "Create Announcement" })}
              </Button>
            )}
          </div>
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onEdit={canEditAnnouncements ? handleEditAnnouncement : undefined}
              onDelete={canEditAnnouncements ? handleDeleteAnnouncement : undefined}
              canEdit={canEditAnnouncements}
              currentUserId={user?.id}
              isStaffUser={isStaffUser}
            />
          ))}
        </div>
      )}

      {announcements.length === 0 && canEditAnnouncements && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <IconBell className="w-5 h-5 text-purple-500" />
              {t("pages.home.announcements", { defaultValue: "Announcements" })}
            </h2>
            <Button onClick={handleCreateAnnouncement} size="sm">
              <IconPlus className="h-4 w-4 mr-2" />
              {t("pages.home.createAnnouncement", { defaultValue: "Create Announcement" })}
            </Button>
          </div>
        </div>
      )}

      {polls.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <IconChartBar className="w-5 h-5 text-purple-500" />
            {t("pages.home.polls", { defaultValue: "Polls" })}
          </h2>
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} onVote={handlePollVote} />
          ))}
        </div>
      )}

      {/* Announcement Form Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement
                ? t("pages.home.editAnnouncement", { defaultValue: "Edit Announcement" })
                : t("pages.home.createAnnouncement", { defaultValue: "Create Announcement" })}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement
                ? t("pages.home.editAnnouncementDesc", { defaultValue: "Update the announcement details" })
                : t("pages.home.createAnnouncementDesc", { defaultValue: "Create a new announcement for your track" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                {t("common.title", { defaultValue: "Title" })} *
              </Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("pages.home.announcementTitlePlaceholder", { defaultValue: "Enter announcement title" })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">
                {t("common.body", { defaultValue: "Body" })} *
              </Label>
              <Textarea
                id="body"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder={t("pages.home.announcementBodyPlaceholder", { defaultValue: "Enter announcement content" })}
                rows={6}
                disabled={isSubmitting}
              />
            </div>

            {isStaffUser && (
              <div className="space-y-2">
                <Label htmlFor="scope">
                  {t("pages.home.scope", { defaultValue: "Scope" })} *
                </Label>
                <Select
                  value={formScope}
                  onValueChange={(value: "GLOBAL" | "TRACK") => {
                    setFormScope(value);
                    if (value === "GLOBAL") {
                      setFormTrack("");
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">
                      {t("pages.home.global", { defaultValue: "Global" })}
                    </SelectItem>
                    <SelectItem value="TRACK">
                      {t("pages.home.track", { defaultValue: "Track" })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formScope === "TRACK" || (!isStaffUser && isInstructorUser)) && (
              <div className="space-y-2">
                <Label htmlFor="track">
                  {t("pages.home.track", { defaultValue: "Track" })}
                  {isStaffUser && formScope === "TRACK" && " *"}
                </Label>
                <Select
                  value={formTrack}
                  onValueChange={setFormTrack}
                  disabled={isSubmitting || isLoadingTracks}
                >
                  <SelectTrigger id="track">
                    <SelectValue placeholder={
                      isLoadingTracks
                        ? t("common.loading", { defaultValue: "Loading..." })
                        : t("pages.home.selectTrack", { defaultValue: "Select a track" })
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.map((track) => (
                      <SelectItem key={track.id} value={track.id.toString()}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isStaffUser && isInstructorUser && (
                  <p className="text-xs text-muted-foreground">
                    {t("pages.home.trackOptional", { defaultValue: "Optional if you train only one track" })}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="publish_at">
                {t("pages.home.publishAt", { defaultValue: "Publish At" })} *
              </Label>
              <Input
                id="publish_at"
                type="datetime-local"
                value={formPublishAt}
                onChange={(e) => setFormPublishAt(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expire_at">
                {t("pages.home.expireAt", { defaultValue: "Expire At" })}
                <span className="text-muted-foreground text-xs ml-2">
                  ({t("common.optional", { defaultValue: "Optional" })})
                </span>
              </Label>
              <Input
                id="expire_at"
                type="datetime-local"
                value={formExpireAt}
                onChange={(e) => setFormExpireAt(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAnnouncementDialog(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleSubmitAnnouncement} disabled={isSubmitting}>
              {isSubmitting
                ? t("common.saving", { defaultValue: "Saving..." })
                : editingAnnouncement
                ? t("common.update", { defaultValue: "Update" })
                : t("common.create", { defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}