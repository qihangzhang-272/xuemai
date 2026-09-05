import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme/tokens';

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="h3">{title}</AppText>
      {action ? <AppText variant="small">{action}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
});
