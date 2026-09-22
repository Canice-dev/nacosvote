import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReceiptScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFA]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View className="flex-1 justify-center px-6">
        <View className="rounded-[24px] border border-[#DCE8E4] bg-white p-6">
          <Text className="text-[14px] font-extrabold text-[#176353]">
            BALLOT SUBMITTED
          </Text>
          <Text className="mt-3 text-[30px] font-bold leading-[37px] tracking-[-0.8px] text-[#17312F]">
            Your vote has already been recorded.
          </Text>
          <Text className="mt-4 text-[15px] leading-[23px] text-[#66807A]">
            Your ballot is anonymous and final. For ballot secrecy, we cannot
            retrieve a previous receipt or reveal any voting choices.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
            className="mt-8 h-14 items-center justify-center rounded-full bg-[#0E5A4F] active:opacity-90"
          >
            <Text className="text-[16px] font-extrabold text-white">
              Return home
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
