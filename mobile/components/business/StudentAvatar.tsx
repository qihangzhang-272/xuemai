import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Student } from '@/lib/types/domain';
import { statusColor } from '@/lib/workflows/feedback';
import { colors, radius } from '@/theme/tokens';

export function StudentAvatar({
  student,
  selected = false,
  onPress,
}: {
  student: Student;
  selected?: boolean;
  onPress?: () => void;
}) {
  const color = statusColor(student.currentStatus);

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <View style={[styles.circle, { backgroundColor: color }, selected && styles.selected]}>
        <Text style={styles.initial}>{student.avatarText ?? student.name.slice(0, 1)}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {student.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginRight: 18,
    width: 64,
  },
  circle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  selected: {
    borderColor: colors.primarySoft,
    borderWidth: 5,
  },
  initial: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '900',
  },
  name: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
});
