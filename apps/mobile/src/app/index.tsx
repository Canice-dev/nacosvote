import "../../global.css";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function App() {
  const router = useRouter();
  return (
    <LinearGradient
      colors={["#17312F", "#0E5A4F", "#16806B", "#B8DED1"]}
      locations={[0, 0.42, 0.72, 1]}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={["transparent", "rgba(23, 49, 47, 0.4)", "#17312F"]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View className=" flex-1 justify-end px-6 pt-20.5 pb-12">
        <View>
          <Text style={styles.title}>Your voice,{"\n"}your vote.</Text>
          <Text style={styles.description}>
            Secure, simple and transparent elections for every student.
          </Text>

          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            className="items-center bg-white rounded-full mt-[32] py-[17]"
          >
            <Text className="text-[#0E5A4F] text-lg font-extrabold">
              Get started
            </Text>
          </Pressable>
        </View>
      </View>
      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 84,
    paddingBottom: 48,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1.4,
    lineHeight: 49,
  },
  description: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    maxWidth: 300,
  },
});
