/**
 * Custom Modal - Web & Mobile Compatible
 * 
 * Works on both React Native and React Native Web
 * Uses absolute positioning for web compatibility
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function CustomModal({ visible, onClose, children }: CustomModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop - Dismisses modal when clicked */}
      <Pressable 
        style={styles.backdrop} 
        onPress={onClose}
      />
      
      {/* Modal Content */}
      <View style={styles.container}>
        {children}
      </View>
    </View>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    backgroundColor: '#1A1F3A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)' as any,
        bottom: 'auto',
        width: '90%',
        maxWidth: 500,
        borderRadius: 16,
      },
    }),
  },
});
