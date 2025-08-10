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
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-amber-700 dark:text-amber-200">
            <IconUsers className="text-amber-600 dark:text-amber-300" /> Total Candidates
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums text-amber-900 dark:text-amber-100">
            {total.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
            <IconUserCheck className="text-emerald-600 dark:text-emerald-300" /> Interviewed
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
            {interviewed.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30">
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-red-700 dark:text-red-200">
            <IconUserX className="text-red-600 dark:text-red-300" /> Not Interviewed
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums text-red-900 dark:text-red-100">
            {notInterviewed.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
