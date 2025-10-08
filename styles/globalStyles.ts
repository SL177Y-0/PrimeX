import { StyleSheet } from 'react-native';

/**
 * Global styles to remove yellow outline from TextInput on web
 */
export const globalTextInputStyle = {
  borderWidth: 0,
  outlineStyle: 'none',
  outlineWidth: 0,
  outlineColor: 'transparent',
} as any;

export const removeOutlineStyle = StyleSheet.create({
  input: {
    borderWidth: 0,
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  } as any,
});
