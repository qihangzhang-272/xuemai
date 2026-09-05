import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function AIAssistantScreen() {
  const store = useAppStore();
  const [command, setCommand] = useState('');

  function submit(value: string) {
    const result = store.runAiCommand(value);
    if (result.type === 'batch_feedback') router.push({ pathname: '/batch-feedback', params: { classId: result.classId } });
    if (result.type === 'risk') router.push({ pathname: '/student/[id]', params: { id: result.studentId } });
    if (result.type === 'report') router.push({ pathname: '/report/[id]', params: { id: result.reportId } });
    if (result.type === 'clarify') Alert.alert('学脉 AI', result.message);
  }

  return (
    <Screen>
      <AppText variant="h2">AI 助教</AppText>
      <AppText variant="small" style={styles.subtitle}>
        让学脉 AI 帮你处理反馈、批改、风险和月报。
      </AppText>
      <Card style={styles.commandCard}>
        <AppText variant="h3">让学脉 AI 帮你处理</AppText>
        <TextInput
          value={command}
          onChangeText={setCommand}
          placeholder="例如：帮我生成今天待反馈学生的家长反馈"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Button
          onPress={() => {
            submit(command);
            setCommand('');
          }}>
          执行指令
        </Button>
        <View style={styles.quickRow}>
          {['处理今日反馈', '查找风险学生', '生成班级月报'].map((text) => (
            <Pressable key={text} onPress={() => submit(text)} style={styles.quickChip}>
              <AppText variant="small" style={styles.quickText}>
                {text}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionHeader title="快捷功能" />
      <View style={styles.grid}>
        <Button variant="secondary" onPress={() => router.push('/photo-upload')} style={styles.gridButton}>
          拍照批改
        </Button>
        <Button variant="secondary" onPress={() => router.push('/batch-feedback')} style={styles.gridButton}>
          生成反馈
        </Button>
        <Button variant="secondary" onPress={() => router.push('/(tabs)/reports')} style={styles.gridButton}>
          生成月报
        </Button>
        <Button variant="secondary" onPress={() => router.push({ pathname: '/student/[id]', params: { id: 'stu-zzh' } })} style={styles.gridButton}>
          查找风险
        </Button>
      </View>

      <SectionHeader title="AI 任务队列" />
      {store.aiTasks.map((task) => (
        <Card key={task.id}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">{task.title}</AppText>
            <Badge label={task.status === 'completed' ? '已完成' : task.status === 'waiting_confirmation' ? '待确认' : '处理中'} color={task.status === 'failed' ? colors.red : colors.primary} />
          </View>
          <AppText variant="small" style={styles.cardCopy}>
            {task.description}
          </AppText>
          <AppText variant="small">{task.progressText}</AppText>
        </Card>
      ))}

      <SectionHeader title="AI 操作记录" />
      {store.aiLogs.slice(0, 5).map((log) => (
        <Card key={log.id} warm={log.requiresConfirmation && !log.confirmed}>
          <View style={styles.rowBetween}>
            <AppText variant="body" style={styles.logTitle}>
              {log.title}
            </AppText>
            {log.requiresConfirmation && !log.confirmed ? <Badge label="需确认" color={colors.yellow} /> : <Badge label="已记录" color={colors.primary} />}
          </View>
          {log.requiresConfirmation && !log.confirmed ? (
            <Button variant="secondary" onPress={() => store.confirmAiUpdate(log.id)} style={styles.logButton}>
              确认更新
            </Button>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  commandCard: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickText: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  gridButton: {
    width: '47%',
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardCopy: {
    marginVertical: spacing.sm,
  },
  logTitle: {
    flex: 1,
  },
  logButton: {
    marginTop: spacing.md,
  },
});
