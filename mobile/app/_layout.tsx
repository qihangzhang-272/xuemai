import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppProvider } from '@/lib/store/app-store';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="identity" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="student-create" options={{ headerShown: false }} />
        <Stack.Screen name="student/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="class-create" options={{ headerShown: false }} />
        <Stack.Screen name="class/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="batch-feedback" options={{ headerShown: false }} />
        <Stack.Screen name="feedback-edit" options={{ headerShown: false }} />
        <Stack.Screen name="photo-upload" options={{ headerShown: false }} />
        <Stack.Screen name="photo-confirm" options={{ headerShown: false }} />
        <Stack.Screen name="ai-analyzing" options={{ headerShown: false }} />
        <Stack.Screen name="ai-analysis-result" options={{ headerShown: false }} />
        <Stack.Screen name="report/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}
