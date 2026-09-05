import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/theme/tokens';

const roles = [
  { id: 'individual_teacher', title: '个体老师', description: '一对一、小班课或个人工作室使用。' },
  { id: 'institution_teacher', title: '机构老师', description: '小型教培机构老师或负责人使用。' },
];

export default function IdentitySelectionScreen() {
  const [selected, setSelected] = useState(roles[0].id);

  return (
    <Screen>
      <AppText variant="h2">选择你的身份</AppText>
      <AppText variant="body" style={styles.subtitle}>
        学脉 AI 会根据身份调整工作台入口。
      </AppText>
      <View style={styles.list}>
        {roles.map((role) => (
          <Pressable key={role.id} onPress={() => setSelected(role.id)}>
            <Card style={[styles.option, selected === role.id && styles.selected]}>
              <AppText variant="h3">{role.title}</AppText>
              <AppText variant="small">{role.description}</AppText>
            </Card>
          </Pressable>
        ))}
      </View>
      <Button onPress={() => router.replace('/(tabs)')}>继续</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  list: {
    marginBottom: spacing.lg,
  },
  option: {
    gap: spacing.sm,
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
});
