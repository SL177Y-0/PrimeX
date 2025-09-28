import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';

interface SoftButtonProps {
  title: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function SoftButton({
  title,
  onPress,
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}: SoftButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1);
    }
  };
  
  const buttonStyle = [
    styles.button,
    styles[size],
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.xxl,
      opacity: disabled ? 0.5 : 1,
      ...theme.shadows.soft,
    },
    style,
  ];
  
  const textStyles: StyleProp<TextStyle> = [
    styles.text,
    {
      color: theme.colors.textPrimary,
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
      fontWeight: '600',
    },
    textStyle,
  ];
  
  return (
    <AnimatedTouchableOpacity
      style={[animatedStyle, buttonStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={textStyles}>{title}</Text>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
});
