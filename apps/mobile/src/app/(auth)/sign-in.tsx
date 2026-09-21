import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

export default function SignIn() {
  const router = useRouter();
  const [matricNumber, setMatricNumber] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFA]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-3 pb-7"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="pb-[37px] pt-[42px]">
            <Image
              source={require("../../../assets/logos/logo-mark-3.png")}
              className="mb-[25px] h-[72px] w-[72px]"
              resizeMode="contain"
              accessibilityLabel="NACOS Vote logo"
            />

            <Text className="text-[34px] font-bold leading-[41px] tracking-[-1.1px] text-[#17312F]">
              Welcome back
            </Text>
            <Text className="mt-[10px] max-w-[300px] text-[15px] leading-[22px] text-[#66807A]">
              Sign in to take part in your department&apos;s elections.
            </Text>
          </View>

          <View className="gap-[9px]">
            <Text className="mt-[7px] text-[14px] font-bold text-[#29453F]">
              Matric Number
            </Text>
            <TextInput
              value={matricNumber}
              onChangeText={setMatricNumber}
              placeholder="e.g. 2023/256789"
              placeholderTextColor="#9AA9A5"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              className="mb-[11px] h-14 rounded-[14px] border border-[#DCE8E4] bg-white px-4 text-[15px] text-[#17312F]"
              accessibilityLabel="Matric Number"
            />

            <Pressable
              accessibilityRole="button"
              className="h-[57px] flex-row items-center justify-center rounded-full bg-[#0E5A4F] active:opacity-90"
            >
              <Text className="text-[16px] font-extrabold text-white">
                Sign in
              </Text>
            </Pressable>
          </View>

          <View className="min-h-16 flex-1 flex-row items-end justify-center pt-8">
            <Text className="text-[14px] text-[#66807A]">Admin login?</Text>
            <Pressable accessibilityRole="button">
              <Text className="text-[14px] font-extrabold text-[#0E7564]">
                {" "}
                Login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
