import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import { IconEye, IconStar } from "@tabler/icons-react";

import type { Candidate } from "@/lib/candidates";

type Props = {
  candidate: Candidate;
};

const statusMeta = {
  not_interviewed: {
    label: "Not Interviewed",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  interviewed: {
    label: "Interviewed",
    className: "bg-emerald-600 text-white border-transparent",
  },
} as const;

export function CandidateCard({ candidate }: Props) {
  const meta = statusMeta[candidate.status];
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
              <Badge className={meta.className}>{meta.label}</Badge>
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
          <Link to={`/users/${candidate.id}`}>
            <IconEye className="size-4" /> View
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


