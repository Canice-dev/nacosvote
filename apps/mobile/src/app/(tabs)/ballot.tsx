import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

type Candidate = {
  id: string;
  fullName: string;
  manifesto: string;
  imageUrl: string | null;
};

type Position = {
  id: string;
  name: string;
  candidates: Candidate[];
};

type BallotResponse = {
  positions?: Position[];
  message?: string;
};

type BallotItem = Candidate & {
  positionId: string;
  positionName: string;
  isFirstForPosition: boolean;
};

function apiEndpoint(path: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (!baseUrl) throw new Error("API_NOT_CONFIGURED");
  return `${baseUrl}${path}`;
}

export default function Ballot() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadBallot();
  }, []);

  const ballotItems = useMemo<BallotItem[]>(
    () =>
      positions.flatMap((position) =>
        position.candidates.map((candidate, index) => ({
          ...candidate,
          positionId: position.id,
          positionName: position.name,
          isFirstForPosition: index === 0,
        })),
      ),
    [positions],
  );

  async function loadBallot() {
    setIsLoading(true);
    setMessage(undefined);
    try {
      const response = await fetch(apiEndpoint("/api/student/ballot"), {
        credentials: "include",
      });
      const result = (await response.json()) as BallotResponse;
      if (!response.ok) {
        setMessage(result.message ?? "Unable to load your ballot.");
        return;
      }
      setPositions(result.positions ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "API_NOT_CONFIGURED"
          ? "Ballot service is not configured."
          : "Unable to reach the election service. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function selectCandidate(positionId: string, candidateId: string) {
    setSelectedCandidates((current) => ({
      ...current,
      [positionId]: candidateId,
    }));
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFA]" edges={["top"]}>
      <StatusBar style="dark" />
      <FlatList
        data={ballotItems}
        keyExtractor={(candidate) => candidate.id}
        renderItem={({ item }) => (
          <CandidateCard
            candidate={item}
            selected={selectedCandidates[item.positionId] === item.id}
            onSelect={selectCandidate}
          />
        )}
        contentContainerClassName="px-6 pb-10"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={
          <View className="pb-5 pt-5">
            <Text className="text-[31px] font-bold tracking-[-0.9px] text-[#17312F]">
              Your ballot
            </Text>
            <Text className="mt-2 text-[14px] leading-5 text-[#66807A]">
              Choose one candidate for each position.
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#0E5A4F" />
              <Text className="mt-3 text-[14px] text-[#66807A]">
                Loading candidates…
              </Text>
            </View>
          ) : message ? (
            <View className="rounded-2xl border border-[#E8CBC4] bg-[#FFF8F6] p-5">
              <Text className="text-[14px] leading-5 text-[#994235]">
                {message}
              </Text>
              <Pressable onPress={loadBallot} className="mt-4 self-start">
                <Text className="font-bold text-[#994235]">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <Text className="py-12 text-center text-[14px] text-[#66807A]">
              There are no candidates on this ballot yet.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: BallotItem;
  selected: boolean;
  onSelect: (positionId: string, candidateId: string) => void;
}) {
  return (
    <View>
      {candidate.isFirstForPosition ? (
        <Text className="mb-3 mt-5 text-[13px] font-bold uppercase tracking-[0.8px] text-[#71857F]">
          {candidate.positionName}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => onSelect(candidate.positionId, candidate.id)}
        className={`mb-3 rounded-2xl border bg-white p-5 active:opacity-80 ${
          selected ? "border-[#0E5A4F]" : "border-[#DCE8E4]"
        }`}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[17px] font-bold text-[#17312F]">
              {candidate.fullName}
            </Text>
            {candidate.manifesto ? (
              <Text className="mt-2 text-[14px] leading-5 text-[#66807A]">
                {candidate.manifesto}
              </Text>
            ) : null}
          </View>
          <View
            className={`h-6 w-6 rounded-full border-2 p-1 ${
              selected ? "border-[#0E5A4F]" : "border-[#AABAB5]"
            }`}
          >
            {selected ? (
              <View className="h-full w-full rounded-full bg-[#0E5A4F]" />
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
