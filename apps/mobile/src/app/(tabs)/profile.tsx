import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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

type StudentProfile = {
  fullName: string;
  matricNumber: string;
  schoolEmail: string;
  level: string | null;
  status: "eligible" | "voted" | "disabled";
  departmentName: string;
  electionTitle: string;
};

type ProfileResponse = {
  student?: StudentProfile;
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

export default function Profile() {
  const [student, setStudent] = useState<StudentProfile>();
  const [message, setMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setIsLoading(true);
    setMessage(undefined);
    try {
      const response = await fetch(apiEndpoint("/api/student/profile"), {
        credentials: "include",
      });
      const result = (await response.json()) as ProfileResponse;
      if (!response.ok || !result.student) {
        setMessage(result.message ?? "Unable to load your profile.");
        return;
      }
      setStudent(result.student);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "API_NOT_CONFIGURED"
          ? "Profile service is not configured."
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
        <Text className="pt-5 text-[32px] font-bold tracking-[-0.9px] text-[#17312F]">
          Profile
        </Text>
        <Text className="mt-1 text-[14px] leading-5 text-[#748A84]">
          Your election account and support options.
        </Text>

        {isLoading ? (
          <View className="mt-8 items-center py-12">
            <ActivityIndicator color="#0E5A4F" />
            <Text className="mt-3 text-[14px] text-[#748A84]">
              Loading your profile…
            </Text>
          </View>
        ) : null}
        {message ? (
          <View className="mt-8 rounded-2xl border border-[#E8CBC4] bg-[#FFF8F6] p-5">
            <Text className="text-[14px] leading-5 text-[#994235]">
              {message}
            </Text>
            <Pressable onPress={loadProfile} className="mt-4 self-start">
              <Text className="font-bold text-[#994235]">Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {student ? <ProfileContent student={student} /> : null}

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

        {student ? (
          <Pressable
            accessibilityRole="button"
            className="mt-8 h-14 items-center justify-center rounded-full border border-[#F1D4CF] bg-[#FFF9F7] active:opacity-80"
          >
            <Text className="text-[15px] font-extrabold text-[#B04435]">
              Sign out
            </Text>
          </Pressable>
        ) : null}
        <Text className="mt-4 px-5 text-center text-[12px] leading-5 text-[#748A84]">
          Your voting choices are never shown here or connected to your
          identity.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileContent({ student }: { student: StudentProfile }) {
  const initial = student.fullName.trim().charAt(0).toUpperCase() || "S";

  return (
    <>
      <View className="mt-8 flex-row items-center rounded-[22px] bg-white p-5 shadow-sm">
        <View className="h-15 w-15 items-center justify-center rounded-full bg-[#DFF1EA]">
          <Text className="text-[23px] font-bold text-[#0E5A4F]">
            {initial}
          </Text>
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-[17px] font-bold text-[#17312F]">
            {student.fullName}
          </Text>
          <Text className="mt-1 text-[13px] text-[#748A84]">
            {student.departmentName} Department
          </Text>
        </View>
        <View className="rounded-full bg-[#EAF6F1] px-3 py-1.5">
          <Text className="text-[11px] font-extrabold text-[#176353]">
            {student.status.toUpperCase()}
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
          title={student.matricNumber}
          subtitle="Matric number"
        />
        <ProfileRow
          icon={{ ios: "envelope", android: "mail", web: "mail" }}
          title={student.schoolEmail}
          subtitle={student.level ? `${student.level} level` : "Student level"}
        />
        <ProfileRow
          icon={{ ios: "info.circle", android: "info", web: "info" }}
          title={student.electionTitle}
          subtitle="Active election"
        />
      </View>
    </>
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
