import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';

interface SegmentedTabsProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  accent?: string;
}

export function SegmentedTabs({ 
  options, 
  selectedIndex, 
  onSelect,
  accent 
}: SegmentedTabsProps) {
  const { theme } = useTheme();
  const accentColors = useAccent(accent);
  const animatedIndex = useSharedValue(selectedIndex);
  
  React.useEffect(() => {
    animatedIndex.value = withSpring(selectedIndex);
  }, [selectedIndex, animatedIndex]);
  
  const thumbStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animatedIndex.value,
      options.map((_, i) => i),
      options.map((_, i) => i * (100 / options.length))
    );
    
    return {
      transform: [{ translateX: `${translateX}%` }],
    };
  });
  
  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.chip,
      borderRadius: theme.borderRadius.xs,
    }]}>
      <Animated.View
        style={[
          styles.thumb,
          {
            width: `${100 / options.length}%`,
            backgroundColor: accentColors.from,
            borderRadius: theme.borderRadius.xs - 2,
          },
          thumbStyle,
        ]}
      />
      
      {options.map((option, index) => (
        <Pressable
          key={option}
          style={[styles.option, { width: `${100 / options.length}%` }]}
          onPress={() => onSelect(index)}
        >
          <Text style={[
            styles.optionText,
            {
              color: selectedIndex === index ? '#FFFFFF' : theme.colors.textSecondary,
              fontWeight: selectedIndex === index ? '600' : '500',
            },
          ]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    padding: 2,
    height: 36,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    zIndex: 1,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
