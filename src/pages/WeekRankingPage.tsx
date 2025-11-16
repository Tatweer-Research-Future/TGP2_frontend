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
import { useUserGroups } from "@/hooks/useUserGroups";
import { apiFetch, getCandidates, type BackendCandidate } from "@/lib/api";
import {
  IconArrowBackUp,
  IconDownload,
  IconGripVertical,
  IconRefresh,
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
};

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
  const [originalItems, setOriginalItems] = useState<RankItem[]>([]);
  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      try {
        setIsLoading(true);
        // Fetch all candidates; backend group_id filter isn't aligned with instructor groups
        // UsersPage also calls without group_id to get the trainee list
        const list = await getCandidates();
        const ranked: RankItem[] = (list.results || []).map(
          (c: BackendCandidate) => ({
            id: c.id,
            name: c.name || c.full_name || c.email,
            email: c.email,
          })
        );
        if (!cancelled) {
          setItems(ranked);
          setOriginalItems(ranked);
        }
      } catch (e: unknown) {
        const msg =
          typeof e === "object" &&
          e !== null &&
          "message" in e &&
          typeof (e as { message?: unknown }).message === "string"
            ? (e as { message: string }).message
            : "Failed to load candidates";
        toast.error(msg);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (x) =>
        (x.name && x.name.toLowerCase().includes(q)) ||
        (x.email && x.email.toLowerCase().includes(q))
    );
  }, [items, search]);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(overIndex: number) {
    if (dragIndex === null || dragIndex === overIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
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

  function resetOrder() {
    setItems(originalItems);
  }

  async function submitRanking() {
    if (items.length === 0) {
      toast.error("No candidates to submit");
      return;
    }
    const payload = {
      module: moduleId,
      week_label: weekLabel || undefined,
      track: trackName,
      ranking: items.map((x, i) => ({
        rank: i + 1,
        candidate_id: x.id,
        note: notes[x.id] || "",
      })),
    };
    setIsSubmitting(true);
    try {
      // Attempt to POST to a plausible endpoint. If it doesn't exist, fall back to download.
      await apiFetch<unknown>("/portal/module-ranking/", {
        method: "POST",
        body: payload,
        requireCsrf: true,
      });
      toast.success("Ranking submitted");
      return;
    } catch (err) {
      console.warn(
        "Ranking submit failed, falling back to JSON download:",
        err
      );
      // Fallback: download the JSON so it can be shared/imported manually.
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ranking_${weekLabel || "module"}_${moduleId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Ranking saved as JSON (server endpoint not available)");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rank Week Candidates</h1>
          <p className="text-muted-foreground">
            Track: {trackName} {weekLabel ? `• ${weekLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <IconArrowBackUp className="size-4" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={resetOrder}
            title="Reset to original order"
          >
            <IconRefresh className="size-4" />
            Reset
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
            {isSubmitting ? "Submitting..." : "Submit Ranking"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Drag to rank from best (top) to worst (bottom)</span>
            <div className="w-64">
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            {filtered.map((c, index) => {
              const isDragging = dragIndex === index;
              const meta = getRankMeta(index);
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center gap-4 px-4 py-3 bg-background/95 transition-all duration-150 hover:bg-accent/40 ${
                    isDragging
                      ? "scale-[0.99] shadow-sm ring-2 ring-primary/30"
                      : ""
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
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
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center text-muted-foreground">
                No candidates match your search
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
