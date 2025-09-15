import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

type AIAnalysisBannerProps = {
  title?: string;
  description?: string;
  badgeText?: string;
  analyzeText?: string;
  onAnalyze?: () => void;
  isLoading?: boolean;
  response?: string | null;
  className?: string;
  defaultCollapsed?: boolean;
};

export function AIAnalysisBanner({
  title = "Let AI analyze this candidate and surface key insights.",
  description = "Get a quick summary of strengths, risks, and next-step suggestions.",
  badgeText = "AI analysis",
  analyzeText = "Analyze",
  onAnalyze,
  isLoading = false,
  response = null,
  className,
  defaultCollapsed = false,
}: AIAnalysisBannerProps) {
  const [typedText, setTypedText] = useState("");
  const [isResponseExpanded, setIsResponseExpanded] = useState<boolean>(false);
  const handleAnalyzeClick = () => {
    setIsResponseExpanded(true);
    onAnalyze?.();
  };

  useEffect(() => {
    if (!response) {
      setTypedText("");
      return;
    }
    setTypedText("");
    let i = 0;
    const total = response.length;
    const intervalMs = 14; // fast typewriter
    const timer = setInterval(() => {
      i = Math.min(i + 1, total);
      setTypedText(response.slice(0, i));
      if (i >= total) clearInterval(timer);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [response]);

  // When a stored response is present, default to collapsed preview unless explicitly expanded
  useEffect(() => {
    if (response && response.length > 0) {
      setIsResponseExpanded((prev) => prev || !defaultCollapsed);
    }
  }, [response, defaultCollapsed]);

  function getPreview(text: string, maxChars: number = 100): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxChars) return normalized;
    return normalized.slice(0, maxChars) + "...";
  }
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
        <div className="flex items-start justify-between">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <IconSparkles className="size-4" />
              <span>{badgeText}</span>
            </div>
            <div className="mt-3 text-xl font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
            {!response && (
              <div className="mt-3">
                <Button onClick={handleAnalyzeClick} size="sm" disabled={isLoading}>
                  {analyzeText}
                </Button>
              </div>
            )}
            {(typedText || response) && (
              <div className="mt-3">
                <Card className="border bg-background/70">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-2">
                      <IconSparkles className="mt-0.5 size-5 text-primary" />
                      <div className="flex-1 text-sm md:text-base">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-base md:text-lg font-semibold mb-1">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-sm md:text-base font-semibold mb-1">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-semibold mb-1">{children}</h3>
                            ),
                            p: ({ children }) => (
                              <p className="mb-1 leading-relaxed">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc ml-5 space-y-1 mb-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal ml-5 space-y-1 mb-1">{children}</ol>
                            ),
                            li: ({ children }) => <li className="leading-snug">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                          }}
                        >
                          {isResponseExpanded ? typedText : getPreview(typedText, 100)}
                        </ReactMarkdown>
                        {isResponseExpanded && typedText.length < (response?.length ?? 0) && (
                          <span className="ml-0.5 inline-block w-2 h-4 align-[-1px] bg-primary/80 animate-caret" />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setIsResponseExpanded((v) => !v)}>
                        {isResponseExpanded ? "Hide" : "Show more"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {response && (
              <div className="mt-4">
                <Button onClick={handleAnalyzeClick} size="sm" disabled={isLoading}>
                  {analyzeText}
                </Button>
              </div>
            )}
          </div>
          {/* No outer collapse button anymore */}
        </div>
        {/* Local animation styles */}
        <style>{`
          @keyframes caretBlink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
          .animate-caret { animation: caretBlink 1s steps(2, start) infinite; }
        `}</style>
      </CardContent>
    </Card>
  );
}


