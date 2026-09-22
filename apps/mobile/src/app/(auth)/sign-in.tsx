import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type Step = "matric" | "otp";
type AuthResponse = {
  message?: string;
  developmentCode?: string;
  nextPath?: string;
  alreadyVoted?: boolean;
  developmentError?: string;
};

const matricPattern = /^\d{4}\/\d{6}$/;
const otpPattern = /^\d{6}$/;

function apiEndpoint(path: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (!baseUrl) throw new Error("API_NOT_CONFIGURED");
  return `${baseUrl}${path}`;
}

export default function SignIn() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("matric");
  const [matricNumber, setMatricNumber] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedMatricNumber = useMemo(
    () => matricNumber.replaceAll(" ", ""),
    [matricNumber],
  );

  async function requestCode() {
    if (!matricPattern.test(normalizedMatricNumber)) {
      setMessage("Use the format YYYY/######, for example 2023/243674.");
      return;
    }
    setIsSubmitting(true);
    setMessage(undefined);
    try {
      const response = await fetch(apiEndpoint("/api/student/auth/start"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricNumber: normalizedMatricNumber }),
      });
      const result: AuthResponse = await response.json();
      if (!response.ok) {
        setMessage(result.message ?? "Unable to start sign-in.");
        return;
      }
      const developmentHint = result.developmentCode
        ? ` Development code: ${result.developmentCode}`
        : "";
      setMessage(
        `${result.message ?? "Enter the code to continue."}${developmentHint}`,
      );
      setStep("otp");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "API_NOT_CONFIGURED"
          ? "Sign-in is not configured. Please contact election support."
          : "Unable to reach the sign-in service. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!otpPattern.test(code)) {
      setMessage("Enter the six-digit verification code.");
      return;
    }
    setIsSubmitting(true);
    setMessage(undefined);
    try {
      const response = await fetch(apiEndpoint("/api/student/auth/verify"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricNumber: normalizedMatricNumber, code }),
      });
      const result: AuthResponse = await response.json();
      if (!response.ok || !result.nextPath) {
        const developmentHint = result.developmentError
          ? ` Development error: ${result.developmentError}`
          : "";
        setMessage(
          `${result.message ?? "Unable to verify your code."}${developmentHint}`,
        );
        return;
      }
      if (result.alreadyVoted) {
        router.replace("/student/receipt");
        return;
      }
      router.replace("/(tabs)");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "API_NOT_CONFIGURED"
          ? "Sign-in is not configured. Please contact election support."
          : "Unable to reach the sign-in service. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function useDifferentMatricNumber() {
    setStep("matric");
    setCode("");
    setMessage(undefined);
  }

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
              {step === "matric" ? "Welcome back" : "Enter your code"}
            </Text>
            <Text className="mt-[10px] max-w-[300px] text-[15px] leading-[22px] text-[#66807A]">
              {step === "matric"
                ? "Sign in to take part in your department's elections."
                : "Enter the six-digit code sent to your registered school email."}
            </Text>
          </View>
          <View className="gap-[9px]">
            {step === "matric" ? (
              <>
                <Text className="mt-[7px] text-[14px] font-bold text-[#29453F]">
                  Matric Number
                </Text>
                <TextInput
                  value={matricNumber}
                  onChangeText={(value) => {
                    setMatricNumber(value.replaceAll(" ", ""));
                    setMessage(undefined);
                  }}
                  placeholder="e.g. 2023/256789"
                  placeholderTextColor="#9AA9A5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={requestCode}
                  editable={!isSubmitting}
                  className="mb-[11px] h-14 rounded-[14px] border border-[#DCE8E4] bg-white px-4 text-[15px] text-[#17312F]"
                  accessibilityLabel="Matric Number"
                />
                <Text className="-mt-[4px] mb-[11px] text-[13px] leading-5 text-[#66807A]">
                  Enter it exactly as it appears on your student record.
                </Text>
                <Button
                  disabled={isSubmitting}
                  onPress={requestCode}
                  label="Send verification code"
                  loading={isSubmitting}
                />
              </>
            ) : (
              <>
                <Text className="mt-[7px] text-[14px] font-bold text-[#29453F]">
                  Six-digit verification code
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(value) => {
                    setCode(value.replace(/\D/g, "").slice(0, 6));
                    setMessage(undefined);
                  }}
                  placeholder="000000"
                  placeholderTextColor="#9AA9A5"
                  autoComplete="one-time-code"
                  autoFocus
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={verifyCode}
                  editable={!isSubmitting}
                  className="mb-[11px] h-14 rounded-[14px] border border-[#DCE8E4] bg-white px-4 text-center text-[20px] font-bold tracking-[8px] text-[#17312F]"
                  accessibilityLabel="Six-digit verification code"
                />
                <Text className="-mt-[4px] mb-[11px] text-[13px] leading-5 text-[#66807A]">
                  The code expires in 10 minutes and can be used once.
                </Text>
                <Button
                  disabled={isSubmitting || code.length !== 6}
                  onPress={verifyCode}
                  label="Verify and continue"
                  loading={isSubmitting}
                />
                <TextButton
                  disabled={isSubmitting}
                  onPress={requestCode}
                  label="Resend verification code"
                />
                <TextButton
                  disabled={isSubmitting}
                  onPress={useDifferentMatricNumber}
                  label="Use a different matric number"
                />
              </>
            )}
          </View>
          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-5 rounded-[14px] bg-[#EAF6F1] px-4 py-3 text-[14px] leading-5 text-[#176353]"
            >
              {message}
            </Text>
          ) : null}
          <Text className="mt-6 text-center text-[12px] leading-5 text-[#66807A]">
            We use your registered school email only to verify eligibility. Your
            identity is never stored with your ballot choices.
          </Text>
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

function Button({
  disabled,
  onPress,
  label,
  loading,
}: {
  disabled: boolean;
  onPress: () => void;
  label: string;
  loading: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-[57px] flex-row items-center justify-center rounded-full bg-[#0E5A4F] active:opacity-90 disabled:opacity-70"
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-[16px] font-extrabold text-white">{label}</Text>
      )}
    </Pressable>
  );
}

function TextButton({
  disabled,
  onPress,
  label,
}: {
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="items-center py-2"
    >
      <Text className="text-[14px] font-bold text-[#0E7564]">{label}</Text>
    </Pressable>
  );
}
