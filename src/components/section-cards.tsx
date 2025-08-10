import { IconUserCheck, IconUserX, IconUsers } from "@tabler/icons-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Props = {
  total: number
  interviewed: number
  notInterviewed: number
}

export function SectionCards({ total, interviewed, notInterviewed }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsers className="text-foreground/70" /> Total Candidates
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {total.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUserCheck className="text-emerald-600" /> Interviewed
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {interviewed.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUserX className="text-gray-500" /> Not Interviewed
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {notInterviewed.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
