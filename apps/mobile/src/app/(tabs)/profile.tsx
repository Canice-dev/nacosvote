import { Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileRowProps = {
  icon: {
    ios: "person.crop.circle" | "hand.raised" | "envelope" | "info.circle";
    android: "account_circle" | "policy" | "mail" | "info";
    web: "account_circle" | "policy" | "mail" | "info";
  };
  title: string;
  subtitle?: string;
};

export default function Profile() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFA]" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pt-5 text-[32px] font-bold tracking-[-0.9px] text-[#17312F]">
          Profile
        </Text>
        <Text className="mt-1 text-[14px] leading-5 text-[#748A84]">
          Your election account and support options.
        </Text>

        <View className="mt-8 flex-row items-center rounded-[22px] bg-white p-5 shadow-sm">
          <View className="h-15 w-15 items-center justify-center rounded-full bg-[#DFF1EA]">
            <Text className="text-[23px] font-bold text-[#0E5A4F]">S</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-[17px] font-bold text-[#17312F]">
              Student voter
            </Text>
            <Text className="mt-1 text-[13px] text-[#748A84]">
              Verified for the active election
            </Text>
          </View>
          <View className="rounded-full bg-[#EAF6F1] px-3 py-1.5">
            <Text className="text-[11px] font-extrabold text-[#176353]">
              VERIFIED
            </Text>
          </View>
        </View>

        <SectionLabel label="Account" />
        <View className="overflow-hidden rounded-[20px] bg-white">
          <ProfileRow
            icon={{
              ios: "person.crop.circle",
              android: "account_circle",
              web: "account_circle",
            }}
            title="Account details"
            subtitle="Your verified voter status"
          />
          <ProfileRow
            icon={{ ios: "hand.raised", android: "policy", web: "policy" }}
            title="Privacy notice"
            subtitle="How your election data is protected"
          />
        </View>

        <SectionLabel label="Support" />
        <View className="overflow-hidden rounded-[20px] bg-white">
          <ProfileRow
            icon={{ ios: "envelope", android: "mail", web: "mail" }}
            title="Election support"
            subtitle="Get help with eligibility or voting"
          />
          <ProfileRow
            icon={{ ios: "info.circle", android: "info", web: "info" }}
            title="About NACOS Vote"
            subtitle="Secure departmental elections"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          className="mt-8 h-14 items-center justify-center rounded-full border border-[#F1D4CF] bg-[#FFF9F7] active:opacity-80"
        >
          <Text className="text-[15px] font-extrabold text-[#B04435]">
            Sign out
          </Text>
        </Pressable>
        <Text className="mt-4 px-5 text-center text-[12px] leading-5 text-[#748A84]">
          Your voting choices are never shown here or connected to your
          identity.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-3 mt-8 text-[13px] font-extrabold uppercase tracking-[0.8px] text-[#71857F]">
      {label}
    </Text>
  );
}

function ProfileRow({ icon, title, subtitle }: ProfileRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center border-b border-[#EDF1EF] px-5 py-4 last:border-b-0 active:bg-[#F8FBFA]"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F0F6F3]">
        <SymbolView name={icon} size={18} tintColor="#47655E" weight="medium" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-bold text-[#29453F]">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[12px] text-[#81928D]">{subtitle}</Text>
        ) : null}
      </View>
      <Text className="text-[23px] font-light leading-6 text-[#9AA9A5]">›</Text>
    </Pressable>
  );
}
