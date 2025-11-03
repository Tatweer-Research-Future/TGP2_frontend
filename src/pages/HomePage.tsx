import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getAnnouncements,
  getPolls,
  voteOnPoll,
  type Announcement,
  type Poll,
} from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBell, IconChartBar } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { useUserGroups } from "@/hooks/useUserGroups";
import { cn } from "@/lib/utils";

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

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const { t } = useTranslation();
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const isNew = isNewAnnouncement(announcement.publish_at);
  
  const reactions: Array<{ emoji: string; label: string; count: number }> = [
    { emoji: "👍", label: "Like", count: 12 },
    { emoji: "❤️", label: "Love", count: 8 },
    { emoji: "😂", label: "Funny", count: 5 },
    { emoji: "🤔", label: "Thinking", count: 3 },
    { emoji: "🙌", label: "Celebrate", count: 15 },
    { emoji: "💯", label: "Perfect", count: 7 },
    { emoji: "😢", label: "Sad", count: 2 },
  ];
  
  return (
    <Card className={cn(
      "border-l-4",
      isNew ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/10" : "border-l-blue-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 relative">
            <IconBell className={cn(
              "w-5 h-5",
              isNew ? "text-green-500" : "text-blue-500"
            )} />
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
                <h3 className="font-semibold text-base sm:text-lg">{announcement.title}</h3>
                {isNew && (
                  <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 shrink-0 animate-pulse">
                    NEW
                  </Badge>
                )}
              </div>
              <Badge variant="secondary" className="text-sm shrink-0">
                {formatDate(announcement.publish_at)}
              </Badge>
            </div>
            <p className="text-base text-muted-foreground whitespace-pre-wrap break-words">
              {announcement.body}
            </p>
            
            {/* Emoji Reaction Buttons - Hidden for now */}
            <div className="hidden flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
              {reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => setSelectedEmoji(selectedEmoji === reaction.emoji ? null : reaction.emoji)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors hover:bg-muted ${
                    selectedEmoji === reaction.emoji
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : ""
                  }`}
                  title={reaction.label}
                >
                  <span className="text-lg">{reaction.emoji}</span>
                  <span className="text-xs text-muted-foreground">{reaction.count}</span>
                </button>
              ))}
            </div>
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
  const { groupId } = useUserGroups();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold">
          {t("pages.home.title", { defaultValue: "Home" })}
        </h1>
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <IconBell className="w-5 h-5 text-purple-500" />
            {t("pages.home.announcements", { defaultValue: "Announcements" })}
          </h2>
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
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
    </div>
  );
}