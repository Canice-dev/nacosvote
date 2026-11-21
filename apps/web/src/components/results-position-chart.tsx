"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

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
  type ChartConfig,
} from "@/components/ui/chart";

export type CandidateResult = {
  id: string;
  name: string;
  imageUrl: string | null;
  votes: number;
};

type ResultsPositionChartProps = {
  name: string;
  candidates: CandidateResult[];
};

const chartConfig = {
  votes: {
    label: "Votes",
    color: "#16806b",
  },
} satisfies ChartConfig;

export function ResultsPositionChart({
  name,
  candidates,
}: ResultsPositionChartProps) {
  const totalVotes = candidates.reduce(
    (total, candidate) => total + candidate.votes,
    0,
  );
  const leaderVotes = Math.max(
    0,
    ...candidates.map((candidate) => candidate.votes),
  );
  const leaders = new Set(
    candidates
      .filter((candidate) => leaderVotes > 0 && candidate.votes === leaderVotes)
      .map((candidate) => candidate.id),
  );
  const chartData = candidates.map((candidate) => {
    const percentage =
      totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
    return {
      ...candidate,
      resultLabel: `${candidate.votes} vote${candidate.votes === 1 ? "" : "s"}${String.fromCharCode(183)} ${percentage}%`,
    };
  });
  const leaderNames = candidates
    .filter((candidate) => leaders.has(candidate.id))
    .map((candidate) => candidate.name);
  const resultSummary =
    leaderNames.length === 0
      ? "No votes recorded"
      : leaderNames.length > 1
        ? `Tied: ${leaderNames.join(", ")}`
        : `Winner: ${leaderNames[0]}`;

  return (
    <Card className="border-0 bg-white shadow-none ring-0">
      <CardHeader className="px-5 py-4 sm:px-6">
        <CardTitle className="text-lg font-semibold text-[#292d2b]">
          {name}
        </CardTitle>
        <CardDescription className="text-sm text-[#727975]">
          {resultSummary} · {totalVotes} vote{totalVotes === 1 ? "" : "s"}{" "}
          counted
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-5 sm:px-6">
        <div className="flex w-full items-stretch">
          <div className="w-45 shrink-0">
            {chartData.map((candidate) => {
              const isLeader = leaders.has(candidate.id);
              const initials = candidate.name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={candidate.id}
                  className="flex h-16.5 items-center gap-5"
                  title={candidate.name}
                >
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e7f4ed] bg-cover bg-center text-[11px] font-bold text-[#177052]"
                    style={
                      candidate.imageUrl
                        ? { backgroundImage: `url("${candidate.imageUrl}")` }
                        : undefined
                    }
                  >
                    {!candidate.imageUrl && initials}
                  </div>
                  <span
                    className={`truncate text-xs text-[#39413e] ${
                      isLeader ? "font-semibold" : "font-normal"
                    }`}
                  >
                    {candidate.name}
                  </span>
                </div>
              );
            })}
          </div>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto min-w-0 flex-1"
            style={{ height: chartData.length * 66 }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 96, bottom: 4, left: 0 }}
              barCategoryGap={16}
            >
              <CartesianGrid horizontal={false} stroke="#e7ece9" />
              <XAxis dataKey="votes" type="number" hide />
              <YAxis
                dataKey="id"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={false}
                width={0}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="votes" radius={5} maxBarSize={28}>
                {chartData.map((candidate) => (
                  <Cell
                    key={candidate.id}
                    fill={leaders.has(candidate.id) ? "#16806b" : "#a9cfc3"}
                  />
                ))}
                <LabelList
                  dataKey="resultLabel"
                  position="right"
                  offset={8}
                  className="fill-[#39413e]"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
        {leaders.size > 0 && (
          <p className="sr-only" aria-live="polite">
            {leaderNames.length > 1
              ? `Tied candidates: ${leaderNames.join(", ")}`
              : `Winner: ${leaderNames[0]}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
