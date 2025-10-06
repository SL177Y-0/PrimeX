import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  ViewStyle,
  TextStyle,
  ColorValue,
  StyleProp
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { useAccent } from '../theme/useAccent';

interface GradientPillButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  accent?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function GradientPillButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  accent,
  disabled = false,
  style,
  textStyle,
}: GradientPillButtonProps) {
  const { theme } = useTheme();
  const accentColors = useAccent(accent);
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withTiming(0.98, { duration: 100 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };
  
  const getGradientColors = (): [ColorValue, ColorValue] => {
    if (variant === 'primary') {
      return [accentColors.from, accentColors.to];
    }
    return ['transparent', 'transparent'];
  };
  
  const buttonStyle = [
    styles.button,
    styles[size],
    {
      borderRadius: theme.borderRadius.xxl,
      opacity: disabled ? 0.5 : 1,
    },
    variant === 'secondary' && {
      backgroundColor: theme.colors.chip,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    variant === 'ghost' && {
      backgroundColor: 'transparent',
    },
    style,
  ];
  
  const textStyles: StyleProp<TextStyle> = [
    styles.text,
    {
      color: variant === 'primary' ? '#FFFFFF' : theme.colors.textPrimary,
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
      <LinearGradient
        colors={getGradientColors()}
        style={[StyleSheet.absoluteFill, { borderRadius: theme.borderRadius.xxl }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <Text style={textStyles}>{title}</Text>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
