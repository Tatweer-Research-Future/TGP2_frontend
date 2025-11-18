import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  type Location,
} from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import { useUserGroups } from "@/hooks/useUserGroups";
import {
  getModuleTraineeOrders,
  submitModuleTraineeOrders,
  getTraineePerformance,
  type TraineeOrdersResponse,
  type TraineeOrderItem,
} from "@/lib/api";
import {
  IconArrowBackUp,
  IconDownload,
  IconGripVertical,
  IconCheck,
  IconCrown,
  IconMedal,
  IconAward,
} from "@tabler/icons-react";
import { toast } from "sonner";

type RankItem = {
  id: number;
  name: string;
  email: string;
  avatar?: string;
};

function getLatestUpdatedAt(orders: TraineeOrderItem[]): string | null {
  return orders.reduce<string | null>((latest, order) => {
    if (!order.updated_at) return latest;
    if (!latest) return order.updated_at;
    return new Date(order.updated_at).getTime() > new Date(latest).getTime()
      ? order.updated_at
      : latest;
  }, null);
}

export default function WeekRankingPage() {
  const navigate = useNavigate();
  const params = useParams();
  const moduleId = params.moduleId ?? params.id ?? "";
  const location = useLocation() as Location & {
    state?: { weekOrder?: number; moduleTitle?: string };
  };
  const { groupId, groups } = useUserGroups();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<RankItem[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasServerOrders, setHasServerOrders] = useState(false);
  const [lastEvaluator, setLastEvaluator] = useState<string | null>(null);
  const [, setLastUpdatedAt] = useState<string | null>(null);
  const [avatarMap, setAvatarMap] = useState<Record<number, string | undefined>>(
    {}
  );

  const trackName = useMemo(() => {
    const g = (groups || []).map((x) => x.trim());
    const arrow = g.find((x) => x.includes("->"));
    if (arrow) return arrow.split("->").pop()!.trim();
    return "My Track";
  }, [groups]);

  const weekLabel = useMemo(() => {
    const order = location?.state?.weekOrder;
    const title = location?.state?.moduleTitle;
    if (order != null) return `Week ${order}`;
    if (title) return title;
    return "";
  }, [location]);

  function getRankMeta(rankIndex: number) {
    if (rankIndex === 0) {
      return {
        badge:
          "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-black",
        leftAccent:
          "bg-gradient-to-b from-amber-300 to-yellow-500 shadow-[0_0_0_2px_rgba(234,179,8,0.25)]",
        icon: <IconCrown className="size-4 text-yellow-600" />,
      };
    }
    if (rankIndex === 1) {
      return {
        badge:
          "bg-gradient-to-r from-zinc-200 via-slate-200 to-zinc-300 text-black",
        leftAccent:
          "bg-gradient-to-b from-slate-200 to-zinc-300 shadow-[0_0_0_2px_rgba(212,212,216,0.35)]",
        icon: <IconMedal className="size-4 text-slate-500" />,
      };
    }
    if (rankIndex === 2) {
      return {
        badge:
          "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 text-black",
        leftAccent:
          "bg-gradient-to-b from-orange-400 to-amber-600 shadow-[0_0_0_2px_rgba(245,158,11,0.25)]",
        icon: <IconAward className="size-4 text-amber-700" />,
      };
    }
    return {
      badge:
        "bg-muted text-muted-foreground border border-border/60 dark:bg-muted/40 dark:text-foreground/80",
      leftAccent:
        "bg-gradient-to-b from-muted/60 to-muted/30 dark:from-muted/30 dark:to-muted/20",
      icon: null as React.ReactNode,
    };
  }
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!moduleId) {
        toast.error("Missing module id");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [ordersResponse, performance] = await Promise.all([
          getModuleTraineeOrders(moduleId),
          getTraineePerformance().catch(() => null),
        ]);

        if (!cancelled && performance) {
          const nextAvatarMap: Record<number, string | undefined> = {};
          performance.tracks.forEach((track) => {
            track.trainees.forEach((trainee) => {
              if (trainee.avatar) {
                nextAvatarMap[trainee.user_id] = trainee.avatar;
              }
            });
          });
          setAvatarMap(nextAvatarMap);
        }

        if (!cancelled) {
          syncFromResponse(ordersResponse);
        }
      } catch (e: unknown) {
        const msg =
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          typeof (e as { message?: unknown }).message === "string"
            ? (e as { message: string }).message
            : "Failed to load trainee orders";
        toast.error(msg);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, moduleId]);

  function syncFromResponse(response: TraineeOrdersResponse) {
    const normalized: RankItem[] = (response.items || []).map((entry) => ({
      id: entry.user,
      name: entry.user_name || entry.user_email,
      email: entry.user_email,
      // Prefer explicit avatar fields from trainee-orders; fall back to global avatar map
      avatar:
        entry.avatar ??
        (entry as any).user_avatar ??
        avatarMap[entry.user] ??
        undefined,
    }));

    const nextNotes: Record<number, string> = {};
    (response.items || []).forEach((entry) => {
      nextNotes[entry.user] = entry.note || "";
    });

    const evaluatorName =
      response.items?.find((entry) => entry.evaluated_by_name)
        ?.evaluated_by_name || null;
    const latestUpdated =
      response.updated_at || getLatestUpdatedAt(response.items || []) || null;

    setItems(normalized);
    setNotes(nextNotes);
    setHasServerOrders(response.has_submitted);
    setLastEvaluator(evaluatorName);
    setLastUpdatedAt(latestUpdated);
  }

  function handleDragStart(id: number) {
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, overId: number) {
    e.preventDefault();
    if (draggingId === null || overId === draggingId) return;
    setItems((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((item) => item.id === draggingId);
      const toIndex = next.findIndex((item) => item.id === overId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  function exportRankingCSV() {
    if (items.length === 0) {
      toast.error("No candidates to export");
      return;
    }
    const headers = ["Rank", "Name", "Email", "Track", "Notes"];
    const rows = items.map((x, i) => [
      String(i + 1),
      `"${(x.name || "").replace(/"/g, '""')}"`,
      `"${(x.email || "").replace(/"/g, '""')}"`,
      `"${(trackName || "").replace(/"/g, '""')}"`,
      `"${(notes[x.id] || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking_${weekLabel || "module"}_${moduleId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Ranking exported");
  }

  // Reset button removed per request

  async function submitRanking() {
    if (items.length === 0) {
      toast.error("No candidates to submit");
      return;
    }
    if (!moduleId) {
      toast.error("Missing module id");
      return;
    }

    const submitItems = items.map((x, i) => ({
      user: x.id,
      order: i + 1,
      note: notes[x.id] || "",
    }));

    setIsSubmitting(true);
    try {
      await submitModuleTraineeOrders(moduleId, submitItems);
      const refreshed = await getModuleTraineeOrders(moduleId);
      syncFromResponse(refreshed);
      toast.success("Ranking submitted");
    } catch (err) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Failed to submit ranking";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rank Trainees</h1>
            <p className="text-muted-foreground">
              Track: {trackName} {weekLabel ? `• ${weekLabel}` : ""}
            </p>
            {hasServerOrders && lastEvaluator && (
              <p className="text-xs text-muted-foreground mt-1">
                Last submitted by {lastEvaluator}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <IconArrowBackUp className="size-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={exportRankingCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <IconDownload className="size-4" />
              Export Ranking
            </Button>
            <Button
              onClick={submitRanking}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <IconCheck className="size-4" />
              {isSubmitting
                ? "Submitting..."
                : hasServerOrders
                ? "Update Ranking"
                : "Submit Ranking"}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Drag to rank from best (top) to worst (bottom)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            {items.map((c, index) => {
              const isDragging = draggingId === c.id;
              const meta = getRankMeta(index);
              return (
                <div
                  key={c.id}
                  data-rank-id={c.id}
                  className={`group relative flex items-center gap-4 px-4 py-3 bg-background/95 transition-all duration-200 ease-out hover:bg-accent/40 will-change-transform ${
                    isDragging
                      ? "scale-95 shadow-xl ring-4 ring-primary/50 bg-accent/60 z-10 cursor-grabbing"
                      : draggingId
                      ? "opacity-90"
                      : ""
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(c.id)}
                  onDragOver={(e) => handleDragOver(e, c.id)}
                  onDragEnter={(e) => handleDragOver(e, c.id)}
                  onDrop={handleDragEnd}
                  onDragEnd={handleDragEnd}
                  aria-grabbed={isDragging}
                >
                  <div
                    className={`absolute left-0 top-0 h-full w-1.5 ${meta.leftAccent}`}
                  />
                  <div className="rounded-md p-1.5 text-muted-foreground cursor-grab active:cursor-grabbing transition-colors hover:bg-muted/40">
                    <IconGripVertical className="size-4" />
                  </div>
                  <div
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${meta.badge}`}
                    title={`Rank ${index + 1}`}
                  >
                    {meta.icon}#{index + 1}
                  </div>
                  <div className="shrink-0">
                    <ConsistentAvatar
                      user={{
                        name: c.name,
                        email: c.email,
                        avatar: c.avatar,
                      }}
                      className="size-9"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium tracking-tight">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.email}
                    </div>
                  </div>
                  <div className="w-72">
                    <Input
                      placeholder="Notes (optional)"
                      value={notes[c.id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                      className="transition-shadow focus-visible:shadow-[0_0_0_3px_rgba(109,92,255,0.25)]"
                    />
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="px-4 py-10 text-center text-muted-foreground">
                No candidates available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
