import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import { IconEye, IconStar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { Candidate } from "@/lib/candidates";

type Props = {
  candidate: Candidate;
};

const getStatusMeta = (t: any) => ({
  not_interviewed: {
    label: t('status.pending'),
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30",
    dotClass: "bg-red-500 dark:bg-red-400",
  },
  in_progress: {
    label: t('status.inProgress'),
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600",
    dotClass: "bg-slate-500 dark:bg-slate-300",
  },
  interviewed: {
    label: t('status.completed'),
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
  },
});

export function CandidateCard({ candidate }: Props) {
  const { t } = useTranslation();
  const meta = getStatusMeta(t)[candidate.status];
  const fields = candidate.fieldsChosen?.slice(0, 3) || [];
  const extraCount = (candidate.fieldsChosen?.length || 0) - fields.length;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ConsistentAvatar
            user={{ name: candidate.fullName, email: candidate.email }}
            className="size-10"
          />
          <div className="flex-1">
            <CardTitle className="text-base font-semibold leading-none">
              {candidate.fullName}
            </CardTitle>
            <div className="mt-2">
              <Badge className={meta.className}>
                <span className={`inline-block size-2 rounded-full ${meta.dotClass}`} />
                {meta.label}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Points</div>
            <div className="flex items-center gap-1 font-semibold">
              <IconStar className="size-4 text-yellow-500" />
              <span>{candidate.points ?? 0}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Selected Fields</div>
          <div className="flex flex-wrap gap-1.5">
            {fields.map((f, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
            {extraCount > 0 && (
              <Badge variant="outline" className="text-xs">+{extraCount} more</Badge>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button asChild size="sm" variant="outline">
          <Link to={`/candidates/${candidate.id}`}>
            <IconEye className="size-4" /> {t('common.buttons.view')}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


