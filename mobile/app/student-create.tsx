import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { FixedActionBar } from '@/components/ui/FixedActionBar';
import { FormCard, FormRow, ToggleRow } from '@/components/ui/FormCard';
import { Screen } from '@/components/ui/Screen';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAppStore } from '@/lib/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
const activeDays = new Set(['三', '日']);

export default function StudentCreateScreen() {
  const store = useAppStore();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const classId = store.classes[0]?.id;

  function submit() {
    const student = store.addStudent({
      name: name.trim() || '王一然',
      grade: '八年级',
      subject: '数学',
      learningGoal: goal.trim() || '期末提分',
      classId,
    });
    router.replace({ pathname: '/student/[id]', params: { id: student.id } });
  }

  return (
    <SafeAreaView style={styles.root}>
      <TopAppBar title="学生建档" rightLabel="保存" onRightPress={submit} />
      <Screen contentStyle={styles.content}>
        <FormCard title="基础信息">
          <FormRow label="学生姓名" value={name} placeholder="输入真实姓名" editable onChangeText={setName} />
          <FormRow label="年级" placeholder="请选择" onPress={() => undefined} />
          <FormRow label="科目" placeholder="请选择" onPress={() => undefined} />
          <FormRow label="所属班级" placeholder="请选择（选填）" onPress={() => undefined} />
          <FormRow label="学习目标" value={goal} placeholder="例如：期末提分" editable onChangeText={setGoal} />
        </FormCard>

        <FormCard title="固定上课时间">
          <FormRow label="上课频率" value="每周" suffix="⌄" />
          <View style={styles.weekdaySection}>
            <AppText variant="small" style={styles.weekdayLabel}>
              每周上课日
            </AppText>
            <View style={styles.weekdays}>
              {weekdays.map((day) => {
                const active = activeDays.has(day);
                return (
                  <View key={day} style={[styles.weekday, active && styles.weekdayActive]}>
                    <AppText variant="body" style={[styles.weekdayText, active && styles.weekdayTextActive]}>
                      {day}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>
          <FormRow label="上课时间" value="19:00" suffix="◷" />
          <FormRow label="课程时长" value="60" suffix="min" editable />
          <ToggleRow label="是否重复" />
        </FormCard>

        <FormCard title="课时信息">
          <FormRow label="总课时数" value="24 课时" />
        </FormCard>

        <FormCard title="反馈规则">
          <ToggleRow label="是否每节课后都需要反馈" />
          <FormRow label="反馈触发时间" value="下课后自动生成" onPress={() => undefined} />
          <FormRow label="反馈截止时间" value="当天 22:00 前" onPress={() => undefined} />
          <FormRow label="提醒方式" placeholder="请选择" onPress={() => undefined} />
        </FormCard>

        <Card warm style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <AppText variant="h3" style={styles.infoIcon}>
              i
            </AppText>
            <AppText variant="h3">状态自动切换规则</AppText>
          </View>
          <AppText variant="small" style={styles.infoCopy}>
            系统会根据固定上课时间自动生成课后反馈任务。下课后学生会进入待反馈状态，老师标记已发送后变为已反馈。若超过截止时间仍未发送，则自动变为逾期未反馈。
          </AppText>
        </Card>
      </Screen>
      <FixedActionBar primaryLabel="完成建档" secondaryLabel="稍后设置反馈规则" onPrimary={submit} onSecondary={submit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: 180,
  },
  weekdaySection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  weekdayLabel: {
    color: colors.textSecondary,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekday: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  weekdayActive: {
    backgroundColor: colors.primary,
  },
  weekdayText: {
    color: colors.textSecondary,
  },
  weekdayTextActive: {
    color: colors.surface,
    fontWeight: '800',
  },
  infoCard: {
    padding: spacing.lg,
  },
  infoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoIcon: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radius.pill,
    borderWidth: 2,
    color: colors.primary,
    height: 26,
    lineHeight: 24,
    overflow: 'hidden',
    textAlign: 'center',
    width: 26,
  },
  infoCopy: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
