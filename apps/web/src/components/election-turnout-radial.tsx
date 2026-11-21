"use client";

import {
  Label,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ElectionTurnoutRadialProps = {
  eligibleStudents: number;
  ballotsCast: number;
};

const chartConfig = {
  ballotsCast: {
    label: "Ballots cast",
    color: "#16806b",
  },
  notYetCast: {
    label: "Eligible students not yet voted",
    color: "#cfe7dc",
  },
} satisfies ChartConfig;

export function ElectionTurnoutRadial({
  eligibleStudents,
  ballotsCast,
}: ElectionTurnoutRadialProps) {
  const studentsNotYetVoted = Math.max(0, eligibleStudents - ballotsCast);
  const chartData = [
    {
      notYetCast: studentsNotYetVoted,
      ballotsCast,
    },
  ];

  return (
    <Card className="flex w-full flex-col border-0 bg-transparent shadow-none ring-0">
      <CardHeader className="items-center px-3 pb-0 pt-3 text-center">
        <CardTitle className="text-lg font-semibold text-[#174e46]">
          Voter turnout
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center px-3 pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[190px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={54}
            outerRadius={82}
          >
            <RadialBar
              dataKey="notYetCast"
              fill="var(--color-notYetCast)"
              stackId="turnout"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="ballotsCast"
              fill="var(--color-ballotsCast)"
              stackId="turnout"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
              <PolarAngleAxis
                type="number"
                domain={[0, Math.max(eligibleStudents, 1)]}
                tick={false}
                tickLine={false}
                axisLine={false}
              />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 14}
                          className="fill-[#174e46] text-2xl font-bold"
                        >
                          {eligibleStudents.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 7}
                          className="fill-[#58716b] text-xs"
                        >
                          {eligibleStudents === 1 ? "Student" : "Students"}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

type OtpVerificationRadialProps = {
  otpVerified: number;
  ballotsCast: number;
};

const otpChartConfig = {
  verifiedNotVoted: {
    label: "Verified, not voted",
    color: "#cfe7dc",
  },
  voted: {
    label: "Voted",
    color: "#16806b",
  },
} satisfies ChartConfig;

export function OtpVerificationRadial({
  otpVerified,
  ballotsCast,
}: OtpVerificationRadialProps) {
  const voted = Math.min(otpVerified, ballotsCast);
  const verifiedNotVoted = Math.max(0, otpVerified - voted);
  const chartData = [{ verifiedNotVoted, voted }];

  return (
    <Card className="flex w-full flex-col border-0 bg-transparent shadow-none ring-0">
      <CardHeader className="items-center px-3 pb-0 pt-3 text-center">
        <CardTitle className="text-base font-semibold text-[#174e46]">
          OTP verified
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center px-3 pb-2">
        <ChartContainer
          config={otpChartConfig}
          className="mx-auto aspect-square w-full max-w-[190px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={54}
            outerRadius={82}
          >
            <RadialBar
              dataKey="verifiedNotVoted"
              fill="var(--color-verifiedNotVoted)"
              stackId="otp"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="voted"
              fill="var(--color-voted)"
              stackId="otp"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarAngleAxis
              type="number"
              domain={[0, Math.max(otpVerified, 1)]}
              tick={false}
              tickLine={false}
              axisLine={false}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 14}
                          className="fill-[#174e46] text-2xl font-bold"
                        >
                          {otpVerified.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 7}
                          className="fill-[#58716b] text-xs"
                        >
                          {otpVerified === 1 ? "Student" : "Students"}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
