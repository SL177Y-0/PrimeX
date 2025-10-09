import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
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
  const [containerWidth, setContainerWidth] = useState(0);
  
  React.useEffect(() => {
    animatedIndex.value = withSpring(selectedIndex, {
      damping: 20,
      stiffness: 90,
    });
  }, [selectedIndex]);
  
  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };
  
  const thumbStyle = useAnimatedStyle(() => {
    if (containerWidth === 0) return { opacity: 0 };
    
    const segmentWidth = (containerWidth - 4) / options.length; // -4 for padding
    const translateX = animatedIndex.value * segmentWidth;
    
    return {
      opacity: 1,
      transform: [{ translateX }],
    };
  });
  
  const segmentWidth = containerWidth > 0 ? (containerWidth - 4) / options.length : 0;
  
  return (
    <View 
      style={[styles.container, { 
        backgroundColor: theme.colors.chip,
        borderRadius: 12,
      }]}
      onLayout={handleLayout}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: segmentWidth,
              backgroundColor: accentColors.from,
              borderRadius: 10,
            },
            thumbStyle,
          ]}
        />
      )}
      
      {options.map((option, index) => (
        <Pressable
          key={option}
          style={[styles.option, { flex: 1 }]}
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
    height: 44,
    alignItems: 'center',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    height: 40,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    height: 40,
  },
  optionText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
});
