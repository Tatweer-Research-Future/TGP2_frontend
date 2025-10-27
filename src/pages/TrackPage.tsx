import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconChevronDown,
  IconChevronUp,
  IconPencil,
} from "@tabler/icons-react";
import { Loader } from "@/components/ui/loader";
import { getPortalTracks, type PortalTrack } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export function TrackPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<PortalTrack[] | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const data = await getPortalTracks();
        if (!cancelled) setTracks(data.results ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load tracks");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstTrack = useMemo(
    () => (tracks && tracks.length > 0 ? tracks[0] : null),
    [tracks]
  );

  const toggleWeek = (index: number) => {
    setOpenWeeks((prev) => ({ ...prev, [index]: !(prev[index] ?? true) }));
  };

  return (
    <div className="px-4 lg:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-background to-background p-8 mb-6">
        <div className="text-sm uppercase tracking-wider text-primary/80 mb-1">
          {firstTrack?.name ?? "Data & AI Track"}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Track Title (Data & AI Track)
        </h1>
        <p className="text-muted-foreground mt-2">
          Plan, organize, and edit weekly learning modules.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      )}
      {error && <div className="text-destructive">{error}</div>}

      {!isLoading && !error && firstTrack && (
        <div className="grid grid-cols-1 gap-4">
          {firstTrack.modules
            .sort((a, b) => a.order - b.order)
            .map((mod, idx) => {
              const isOpen = openWeeks[mod.id] ?? true;
              return (
                <Card
                  key={mod.id}
                  className="overflow-hidden gap-0 border-none shadow-none py-3"
                >
                  <CardHeader className="pb-0">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{mod.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setOpenWeeks((p) => ({ ...p, [mod.id]: !isOpen }))
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isOpen ? (
                          <>
                            <IconChevronUp className="size-4 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <IconChevronDown className="size-4 mr-1" />
                            Show
                          </>
                        )}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="pt-0">
                      <div className="mt-3 rounded-md border border-border/60">
                        <div className="divide-y divide-border/70">
                          {mod.sessions
                            .sort((a, b) => a.order - b.order)
                            .map((session) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between py-3"
                              >
                                <div className="text-sm md:text-base">
                                  Day {session.order} — {session.title}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    navigate(
                                      `/track/sessions/${session.id}/edit`
                                    )
                                  }
                                >
                                  <IconPencil className="size-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default TrackPage;
