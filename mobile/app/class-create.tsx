import { router } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ClassCreateScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
        <Button variant="secondary" onPress={() => router.replace('/(tabs)/classes')} style={styles.back}>保存</Button>
      </View>
      <AppText variant="h2">新建班级</AppText>
      <AppText variant="small" style={styles.subtitle}>第一阶段展示表单承接，后续接入真实班级创建。</AppText>
      <Card style={styles.card}>
        <TextInput style={styles.input} defaultValue="初二数学 A 班" placeholder="班级名称" />
        <TextInput style={styles.input} defaultValue="八年级" placeholder="年级" />
        <TextInput style={styles.input} defaultValue="数学" placeholder="科目" />
        <View style={styles.chips}>
          <Badge label="一对一" color={colors.textMuted} />
          <Badge label="小班课" />
          <Badge label="机构班课" color={colors.textMuted} />
        </View>
      </Card>
      <Card warm>
        <AppText variant="h3">默认规则</AppText>
        <AppText variant="body" style={styles.copy}>每节课后自动生成反馈任务，截止时间为下次课前 24H。</AppText>
      </Card>
      <Button onPress={() => router.replace('/(tabs)/classes')}>创建班级</Button>
      <Button variant="secondary" onPress={() => router.replace('/(tabs)/classes')} style={styles.secondary}>稍后添加学生</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  back: {
    minHeight: 42,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  copy: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  secondary: {
    marginTop: spacing.md,
  },
});
