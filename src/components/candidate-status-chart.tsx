"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

interface CandidateStatusChartProps {
  interviewed: number;
  notInterviewed: number;
  total: number;
}

export function CandidateStatusChart({
  interviewed,
  notInterviewed,
  total,
}: CandidateStatusChartProps) {
  const chartData = [
    {
      status: "interviewed",
      count: interviewed,
      fill: "#1EDE9E",
      label: "Interviewed",
    },
    {
      status: "not_interviewed",
      count: notInterviewed,
      fill: "#19c98c",
      label: "Not Interviewed",
    },
  ];

  const chartConfig = {
    count: {
      label: "Count",
    },
    interviewed: {
      label: "Interviewed",
      color: "#1EDE9E",
    },
    not_interviewed: {
      label: "Not Interviewed",
      color: "#19c98c",
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Candidate Status Overview</CardTitle>
        <CardDescription>Total Candidates: {total}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={80}
              outerRadius={120}
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {total}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-sm text-muted-foreground">
                {entry.label}: {entry.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
