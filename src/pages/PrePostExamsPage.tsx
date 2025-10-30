import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getPortalTracks, type PortalTrack } from "@/lib/api";
import {
  getModuleTests,
  type ModuleTestListItem,
  type ModuleTestKind,
} from "@/lib/api";

type ModuleOption = {
  id: number;
  label: string;
  trackName: string;
  order: number;
};

export default function PrePostExamsPage() {
  const [tracks, setTracks] = useState<PortalTrack[] | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [kind, setKind] = useState<ModuleTestKind | "">("");
  const [tests, setTests] = useState<ModuleTestListItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPortalTracks().then((resp) => {
      if (!mounted) return;
      setTracks(resp.results);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!tracks) return;
    const opts: ModuleOption[] = [];
    for (const t of tracks) {
      for (const m of t.modules) {
        const label = `${t.name} – Week ${m.order}${
          m.title ? `: ${m.title}` : ""
        }`;
        opts.push({ id: m.id, label, trackName: t.name, order: m.order });
      }
    }
    // sort by track then order
    opts.sort(
      (a, b) => a.trackName.localeCompare(b.trackName) || a.order - b.order
    );
    setModules(opts);
  }, [tracks]);

  useEffect(() => {
    async function fetchTests() {
      if (!selectedModuleId) {
        setTests(null);
        return;
      }
      setLoading(true);
      try {
        const data = await getModuleTests({
          module: Number(selectedModuleId),
          kind: (kind || undefined) as ModuleTestKind | undefined,
        });
        setTests(data);
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, [selectedModuleId, kind]);

  const moduleLabel = useMemo(() => {
    const idNum = Number(selectedModuleId);
    return modules.find((m) => m.id === idNum)?.label || "";
  }, [modules, selectedModuleId]);

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between">
        <div />
        <Button asChild>
          <Link to="/pre-post-exams/new">+ Add New Pre/Post Test</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Browse Tests</CardTitle>
            <CardDescription>
              Select a week to preview tests. You can filter by kind.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Week</Label>
                <Select
                  value={selectedModuleId}
                  onValueChange={setSelectedModuleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kind</Label>
                <Select
                  value={kind || "ALL"}
                  onValueChange={(v) =>
                    setKind(v === "ALL" ? "" : (v as ModuleTestKind))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="PRE">PRE</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {!selectedModuleId && (
                <p className="text-sm text-muted-foreground">
                  Select a week to view tests.
                </p>
              )}
              {selectedModuleId && loading && (
                <p className="text-sm">Loading tests…</p>
              )}
              {selectedModuleId && !loading && (tests?.length ?? 0) === 0 && (
                <p className="text-sm">
                  No tests found for {moduleLabel}
                  {kind ? ` (${kind})` : ""}.
                </p>
              )}
              {selectedModuleId && !loading && (tests?.length ?? 0) > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {tests!.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t.title}</span>
                              <Badge variant="secondary">{t.kind}</Badge>
                              {t.is_active ? (
                                <Badge>Active</Badge>
                              ) : (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Publish: {t.publish_at || "—"} · Expire:{" "}
                              {t.expire_at || "—"} · Points: {t.total_points}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tip</CardTitle>
            <CardDescription>
              Each week can have one Pre and one Post test.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the button above to create a new test for the selected week.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
