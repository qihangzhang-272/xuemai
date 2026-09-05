import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useAppStore } from '@/lib/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function PhotoUploadScreen() {
  const { studentId, taskId, classId } = useLocalSearchParams<{ studentId?: string; taskId?: string; classId?: string }>();
  const store = useAppStore();
  const [mockPhotos, setMockPhotos] = useState<string[]>([]);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  function addPhoto() {
    const photo = store.addMockPhoto(studentId, taskId, classId);
    setMockPhotos((items) => [photo.id, ...items]);
  }

  if (permissionBlocked) {
    return (
      <Screen>
        <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
        <EmptyState
          title="需要相机权限"
          description="学脉 AI 需要使用相机来拍摄作业、试卷和错题图片。"
          actionLabel="去开启"
          onAction={() => setPermissionBlocked(false)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()} style={styles.back}>返回</Button>
      <AppText variant="h2">拍照上传</AppText>
      <AppText variant="small" style={styles.subtitle}>第一阶段模拟拍照和相册选择，后续接 Expo 相机与相册能力。</AppText>
      <Card warm>
        <AppText variant="h3">添加练习材料</AppText>
        <View style={styles.uploadGrid}>
          <Pressable onPress={addPhoto} style={styles.uploadBox}>
            <AppText variant="h2" style={styles.uploadText}>+</AppText>
            <AppText variant="small">拍照</AppText>
          </Pressable>
          <Pressable onPress={addPhoto} style={styles.uploadBox}>
            <AppText variant="h2" style={styles.uploadText}>图</AppText>
            <AppText variant="small">相册</AppText>
          </Pressable>
        </View>
        <Button variant="ghost" onPress={() => setPermissionBlocked(true)}>模拟权限异常</Button>
      </Card>
      <Card>
        <AppText variant="h3">图片预览</AppText>
        {mockPhotos.length === 0 ? (
          <AppText variant="small" style={styles.subtitle}>暂未添加图片。</AppText>
        ) : (
          <View style={styles.previewGrid}>
            {mockPhotos.map((photoId, index) => (
              <Pressable key={photoId} onPress={() => setMockPhotos((items) => items.filter((id) => id !== photoId))} style={styles.preview}>
                <AppText variant="h3">图片 {index + 1}</AppText>
                <AppText variant="small">点击删除</AppText>
              </Pressable>
            ))}
          </View>
        )}
      </Card>
      <Button
        disabled={mockPhotos.length === 0}
        onPress={() => router.push({ pathname: '/photo-confirm', params: { studentId, taskId, classId, photoCount: String(mockPhotos.length) } })}>
        下一步
      </Button>
    </Screen>
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
  uploadGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  uploadBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flex: 1,
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadText: {
    color: colors.primaryDark,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  preview: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '47%',
  },
});
