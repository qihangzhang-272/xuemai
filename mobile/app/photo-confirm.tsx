import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAppStore } from '@/lib/store/app-store';
import { colors, spacing } from '@/theme/tokens';

export default function PhotoConfirmScreen() {
  const { studentId, classId, taskId, photoCount } = useLocalSearchParams<{
    studentId?: string;
    classId?: string;
    taskId?: string;
    photoCount?: string;
  }>();
  const store = useAppStore();
  const student = store.students.find((item) => item.id === studentId) ?? store.students[0];
  const classGroup = store.classes.find((item) => item.id === classId) ?? store.classes.find((item) => item.id === student.classId);

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
      <AppText variant="h2">上传确认</AppText>
      <AppText variant="small" style={styles.subtitle}>确认图片绑定关系和 AI 分析信息。</AppText>
      <Card>
        <View style={styles.thumb}>
          <AppText variant="h2">{photoCount ?? '1'} 张图片</AppText>
        </View>
        <View style={styles.rows}>
          <Info label="所属学生" value={student.name} />
          <Info label="所属班级" value={classGroup?.name ?? '未绑定'} />
          <Info label="科目" value={student.subject} />
          <Info label="本次主题" value="课堂练习与错题分析" />
        </View>
        <View style={styles.chips}>
          <Badge label="作业" />
          <Badge label="计入学生档案" color={colors.blue} />
        </View>
      </Card>
      <Button onPress={() => router.replace({ pathname: '/ai-analyzing', params: { studentId: student.id, classId: classGroup?.id, taskId } })}>
        开始 AI 分析
      </Button>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="small">{label}</AppText>
      <AppText variant="body" style={styles.infoValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    minHeight: 42,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 160,
    marginBottom: spacing.lg,
  },
  rows: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
