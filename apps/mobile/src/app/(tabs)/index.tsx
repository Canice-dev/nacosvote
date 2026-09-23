import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, router, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

type Election = {
  title: string;
  departmentName: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
};

type ElectionResponse = {
  election?: Election;
  positions?: unknown[];
  message?: string;
};

function apiEndpoint(path: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (!baseUrl) throw new Error("API_NOT_CONFIGURED");
  return `${baseUrl}${path}`;
}

function getRemainingTime(closesAt: Date) {
  const seconds = Math.max(
    0,
    Math.floor((closesAt.getTime() - Date.now()) / 1_000),
  );

  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3_600),
    minutes: Math.floor((seconds % 3_600) / 60),
  };
}

function formatDate(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  })
    .format(value)
    .replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase());
}

function formatTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  })
    .format(value)
    .replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase());
}

export default function Index() {
  const router = useRouter();
  const [election, setElection] = useState<Election>();
  const [positionCount, setPositionCount] = useState(0);
  const [message, setMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });

  useEffect(() => {
    void loadElection();
  }, []);

  useEffect(() => {
    if (!election) return;
    const closesAt = new Date(election.endsAt);
    if (Number.isNaN(closesAt.getTime())) return;

    const updateTime = () => setRemainingTime(getRemainingTime(closesAt));
    updateTime();
    const timer = setInterval(updateTime, 30_000);
    return () => clearInterval(timer);
  }, [election]);

  async function loadElection() {
    setIsLoading(true);
    setMessage(undefined);
    try {
      const response = await fetch(apiEndpoint("/api/student/ballot"), {
        credentials: "include",
      });
      const result = (await response.json()) as ElectionResponse;
      if (!response.ok || !result.election) {
        setMessage(result.message ?? "Unable to load the active election.");
        return;
      }
      setElection(result.election);
      setPositionCount(result.positions?.length ?? 0);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "API_NOT_CONFIGURED"
          ? "Election information is not configured."
          : "Unable to reach the election service. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFA]" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between pt-5">
          <View>
            <Text className="text-[13px] font-semibold text-[#71857F]">
              Welcome back
            </Text>
            <Text className="mt-1 text-[31px] font-bold tracking-[-0.9px] text-[#17312F]">
              Election day
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#E5F2EC]">
            <SymbolView
              name={{
                ios: "checkmark.seal",
                android: "verified",
                web: "verified",
              }}
              size={21}
              tintColor="#176353"
              weight="semibold"
            />
          </View>
        </View>

        {isLoading ? <LoadingState /> : null}
        {message ? (
          <ErrorState message={message} onRetry={loadElection} />
        ) : null}
        {election ? (
          <ElectionContent
            election={election}
            positionCount={positionCount}
            remainingTime={remainingTime}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingState() {
  return (
    <View className="mt-8 items-center border border-[#DDE8E4] bg-white py-10">
      <ActivityIndicator color="#0E5A4F" />
      <Text className="mt-3 text-[14px] text-[#748A84]">
        Loading election details…
      </Text>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="mt-8 border border-[#E8CBC4] bg-[#FFF8F6] px-5 py-5">
      <Text className="text-[14px] leading-5 text-[#994235]">{message}</Text>
      <Pressable
        accessibilityRole="button"
        className="mt-4 self-start border-b border-[#994235] pb-0.5 active:opacity-70"
        onPress={onRetry}
      >
        <Text className="text-[14px] font-bold text-[#994235]">Try again</Text>
      </Pressable>
    </View>
  );
}

function ElectionContent({
  election,
  positionCount,
  remainingTime,
}: {
  election: Election;
  positionCount: number;
  remainingTime: ReturnType<typeof getRemainingTime>;
}) {
  const closesAt = new Date(election.endsAt);

  return (
    <>
      <View className="mt-8 border border-[#CEE2DA] bg-[#EAF5F0] px-5 py-5 rounded-2xl">
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] font-bold uppercase tracking-[0.9px]">
            Voting is open
          </Text>
          <Text className="text-[12px] font-semibold">
            Closes {formatTime(closesAt, election.timezone)}
          </Text>
        </View>
        <Text className="mt-3 text-[22px] font-bold leading-7 tracking-[-0.35px] text-[#17312F]">
          {election.title}
        </Text>
        <Text className="mt-2 text-[14px] text-[#54736B]">
          {election.departmentName} Department
        </Text>
      </View>

      <Text className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-[0.8px] text-[#71857F]">
        Time remaining
      </Text>
      <View className="flex-row rounded-2xl bg-white">
        <TimeUnit value={remainingTime.days} label="Days" />
        <TimeUnit value={remainingTime.hours} label="Hours" />
        <TimeUnit value={remainingTime.minutes} label="Minutes" />
      </View>
      <Text className="mt-3 text-[13px] leading-5 text-[#748A84]">
        Voting closes {formatDate(closesAt, election.timezone)}. Your ballot can
        only be submitted once.
      </Text>

      <View className="mt-8 pt-6">
        <Text className="text-[19px] font-bold tracking-[-0.2px] text-[#17312F]">
          Ready to vote?
        </Text>
        <Text className="mt-1 text-[14px] leading-5 text-[#748A84]">
          Review candidates across {positionCount} positions, then submit your
          choices when you are ready.
        </Text>

        <Pressable
          onPress={() => router.push("/(tabs)/ballot")}
          accessibilityRole="button"
          className="mt-5 flex-row items-center justify-between bg-[#0E5A4F] px-5 py-4 active:bg-[#0A473E] rounded-2xl"
        >
          <View>
            <Text className="text-[16px] font-bold text-white">
              View ballot
            </Text>
            <Text className="mt-0.5 text-[12px] text-[#CDE5DD]">
              Choose one candidate for each position
            </Text>
          </View>
          <SymbolView
            name={{
              ios: "arrow.right",
              android: "arrow_forward",
              web: "arrow_forward",
            }}
            size={20}
            tintColor="#FFFFFF"
            weight="semibold"
          />
        </Pressable>
      </View>

      <View className="mt-7 flex-row items-start pl-3">
        <SymbolView
          name={{ ios: "lock", android: "lock", web: "lock" }}
          size={16}
          tintColor="#47655E"
          weight="medium"
        />
        <Text className="ml-2 flex-1 text-[12px] leading-5 text-[#6A807A]">
          Your identity is verified separately from your ballot choices. Once
          submitted, your vote is final.
        </Text>
      </View>
    </>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center border-r border-[#DDE8E4] py-5 last:border-r-0">
      <Text className="text-[31px] font-bold tracking-[-1px] text-[#17312F]">
        {String(value).padStart(2, "0")}
      </Text>
      <Text className="mt-1 text-[11px] font-bold uppercase tracking-[0.7px] text-[#71857F]">
        {label}
      </Text>
    </View>
  );
}
