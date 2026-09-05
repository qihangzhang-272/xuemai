import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAppStore } from '@/lib/store/app-store';
import { feedbackTaskStatusLabel, taskStatusColor } from '@/lib/workflows/feedback';
import { colors, radius, spacing } from '@/theme/tokens';

export default function FeedbackEditScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const store = useAppStore();
  const task = store.feedbackTasks.find((item) => item.id === taskId) ?? store.feedbackTasks[0];
  const student = store.students.find((item) => item.id === task.studentId);
  const draft = useMemo(() => store.drafts.find((item) => item.id === task.feedbackDraftId), [store.drafts, task.feedbackDraftId]);
  const [content, setContent] = useState(draft?.content ?? '');
  const [confirmOpen, setConfirmOpen] = useState(task.status === 'copied_waiting_confirm');

  useEffect(() => {
    setContent(draft?.content ?? '');
  }, [draft?.content]);

  function ensureDraft() {
    const nextDraft = store.generateFeedback(task.id);
    if (nextDraft) setContent(nextDraft.content);
  }

  function copy() {
    if (draft) store.updateDraftContent(draft.id, content);
    store.copyFeedback(task.id);
    setConfirmOpen(true);
  }

  return (
    <View style={styles.root}>
      <Screen>
        <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
        <View style={styles.header}>
          <View>
            <AppText variant="h2">家长反馈编辑</AppText>
            <AppText variant="small">{student?.name} · {task.topic}</AppText>
          </View>
          <Badge label={feedbackTaskStatusLabel(task.status)} color={taskStatusColor(task.status)} />
        </View>

        <Card warm>
          <AppText variant="h3">微信气泡预览</AppText>
          <View style={styles.bubble}>
            <AppText variant="body">{content || '尚未生成反馈，点击下方按钮开始生成。'}</AppText>
          </View>
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3">反馈正文</AppText>
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="AI 生成的反馈会显示在这里"
            placeholderTextColor={colors.textMuted}
            style={styles.textarea}
          />
          <View style={styles.chips}>
            {['温和', '标准版', '课堂表现', '薄弱点', '下节课建议'].map((item) => <Badge key={item} label={item} />)}
          </View>
          <Button variant="secondary" onPress={ensureDraft}>重新生成</Button>
          <Button onPress={copy} disabled={!content.trim()}>复制到微信</Button>
        </Card>
      </Screen>

      <BottomSheet visible={confirmOpen} title="已复制到微信" onClose={() => setConfirmOpen(false)}>
        <AppText variant="body" style={styles.sheetCopy}>是否已经发送给家长？系统不会自动发送微信，只记录老师确认后的状态。</AppText>
        <View style={styles.sheetActions}>
          <Button onPress={() => {
            store.confirmFeedbackSent(task.id);
            setConfirmOpen(false);
            router.back();
          }}>标记为已发送</Button>
          <Button variant="secondary" onPress={() => setConfirmOpen(false)}>稍后确认</Button>
          <Button variant="ghost" onPress={copy}>重新复制</Button>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    alignSelf: 'flex-start',
    minHeight: 42,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  bubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  textarea: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 220,
    padding: spacing.lg,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sheetCopy: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sheetActions: {
    gap: spacing.md,
  },
});
