import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconSparkles } from "@tabler/icons-react";

type AIAnalysisBannerProps = {
  title?: string;
  description?: string;
  badgeText?: string;
  analyzeText?: string;
  onAnalyze?: () => void;
  className?: string;
};

export function AIAnalysisBanner({
  title = "Let AI analyze this candidate and surface key insights.",
  description = "Get a quick summary of strengths, risks, and next-step suggestions.",
  badgeText = "AI analysis",
  analyzeText = "Analyze",
  onAnalyze,
  className,
}: AIAnalysisBannerProps) {
  return (
    <Card className={`relative overflow-hidden border-0 ${className ?? ""}`}>
      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute -inset-24 blur-3xl opacity-100"
          style={{
            background:
              "radial-gradient(60% 60% at 0% 0%, rgba(255, 0, 128, 0.35), transparent 60%)," +
              "radial-gradient(50% 50% at 100% 0%, rgba(0, 98, 255, 0.3), transparent 60%)," +
              "radial-gradient(55% 55% at 0% 100%, rgba(0, 255, 94, 0.28), transparent 60%)" +
              ",radial-gradient(45% 45% at 100% 100%, rgba(255, 217, 0, 0.22), transparent 60%)",
          }}
        />
      </div>
      <CardContent className="relative z-10 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <IconSparkles className="size-4" />
              <span>{badgeText}</span>
            </div>
            <div className="mt-3 text-xl font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
            <div className="mt-4">
              <Button onClick={onAnalyze} size="sm">
                {analyzeText}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


