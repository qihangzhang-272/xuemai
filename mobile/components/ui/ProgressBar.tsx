import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export function ProgressBar({ value }: { value: number }) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%` as `${number}%`;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
