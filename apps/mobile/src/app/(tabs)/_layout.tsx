import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

const tabIconNames = {
  home: {
    active: { ios: "house.fill", android: "home", web: "home" },
    inactive: { ios: "house", android: "home", web: "home" },
  },
  ballot: {
    active: { ios: "checklist", android: "fact_check", web: "fact_check" },
    inactive: {
      ios: "checklist",
      android: "fact_check",
      web: "fact_check",
    },
  },
  results: {
    active: { ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" },
    inactive: { ios: "chart.bar", android: "bar_chart", web: "bar_chart" },
  },
  profile: {
    active: {
      ios: "person.crop.circle.fill",
      android: "account_circle",
      web: "account_circle",
    },
    inactive: {
      ios: "person.crop.circle",
      android: "account_circle",
      web: "account_circle",
    },
  },
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0E5A4F",
        tabBarInactiveTintColor: "#788C87",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#DCE8E4",
          height: 80,
          paddingTop: 7,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={
                focused ? tabIconNames.home.active : tabIconNames.home.inactive
              }
              size={23}
              tintColor={color}
              weight="semibold"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ballot"
        options={{
          title: "Ballot",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={
                focused
                  ? tabIconNames.ballot.active
                  : tabIconNames.ballot.inactive
              }
              size={23}
              tintColor={color}
              weight="semibold"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: "Results",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={
                focused
                  ? tabIconNames.results.active
                  : tabIconNames.results.inactive
              }
              size={23}
              tintColor={color}
              weight="semibold"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={
                focused
                  ? tabIconNames.profile.active
                  : tabIconNames.profile.inactive
              }
              size={23}
              tintColor={color}
              weight="semibold"
            />
          ),
        }}
      />
    </Tabs>
  );
}
