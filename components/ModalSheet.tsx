import React, { ReactNode } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable,
  SafeAreaView,
  Dimensions 
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeProvider';
import { X } from 'lucide-react-native';

interface ModalSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: number;
}

const { height: screenHeight } = Dimensions.get('window');

export function ModalSheet({ 
  isVisible, 
  onClose, 
  title, 
  children,
  height = screenHeight * 0.8
}: ModalSheetProps) {
  const { theme, isDark } = useTheme();
  const translateY = useSharedValue(height);
  
  React.useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0);
    } else {
      translateY.value = withSpring(height, {}, () => {
        runOnJS(onClose)();
      });
    }
  }, [isVisible, height, onClose, translateY]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  
  if (!isVisible) return null;
  
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={isDark ? 20 : 40}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.sheet,
            {
              height,
              backgroundColor: theme.colors.elevated,
              borderTopLeftRadius: theme.borderRadius.xl,
              borderTopRightRadius: theme.borderRadius.xl,
              ...theme.shadows.soft,
            },
            animatedStyle,
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
            
            {/* Header */}
            {title && (
              <View style={styles.header}>
                <Text style={[styles.title, { 
                  color: theme.colors.textPrimary,
                  ...theme.typography.title 
                }]}>
                  {title}
                </Text>
                <Pressable
                  style={[styles.closeButton, { backgroundColor: theme.colors.chip }]}
                  onPress={onClose}
                >
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            )}
            
            {/* Content */}
            <View style={styles.content}>
              {children}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
