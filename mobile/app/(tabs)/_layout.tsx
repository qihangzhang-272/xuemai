import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: colors.whiteGlass,
          borderTopColor: colors.border,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          height: 82,
          paddingBottom: 14,
          paddingTop: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900' }}>今</Text>,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: '班级',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900' }}>班</Text>,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI 助教',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900' }}>AI</Text>,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: '报告',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900' }}>报</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900' }}>我</Text>,
        }}
      />
    </Tabs>
  );
}
