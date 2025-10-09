import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PositionsList } from './PositionsList';

interface PositionsTabProps {
  // Optional props for customization
  showHeader?: boolean;
  maxHeight?: number;
}

export const PositionsTab: React.FC<PositionsTabProps> = ({
  showHeader = true,
  maxHeight,
}) => {
  return (
    <View style={styles.container}>
      <PositionsList 
        showHeader={showHeader}
        maxHeight={maxHeight}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
