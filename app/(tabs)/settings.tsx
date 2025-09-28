import React from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/Card';
import { 
  Moon, 
  Sun, 
  Monitor, 
  Eye, 
  EyeOff, 
  Globe, 
  DollarSign,
  Shield,
  Bell,
  Info,
  RefreshCw,
  ChevronRight
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { 
    themeMode, 
    setThemeMode, 
    currency, 
    setCurrency,
    hideBalances,
    setHideBalances 
  } = useAppStore();
  
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'System', icon: Monitor },
  ];
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { 
          color: theme.colors.textPrimary,
          ...theme.typography.title 
        }]}>
          Settings
        </Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 0 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Theme Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Appearance
          </Text>
          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Theme
                </Text>
                <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                
                </Text>
              </View>
            </View>
            <View style={styles.themeOptions}>
              {themeOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: themeMode === option.value 
                          ? theme.colors.accentFrom 
                          : theme.colors.chip,
                        borderRadius: theme.borderRadius.xs,
                      },
                    ]}
                    onPress={() => setThemeMode(option.value as any)}
                  >
                    <IconComponent 
                      size={20} 
                      color={themeMode === option.value ? '#FFFFFF' : theme.colors.textPrimary} 
                    />
                    <Text style={[styles.themeOptionText, {
                      color: themeMode === option.value ? '#FFFFFF' : theme.colors.textPrimary,
                    }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>
        
        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Privacy
          </Text>
          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  {hideBalances ? 
                    <EyeOff size={20} color={theme.colors.textSecondary} /> :
                    <Eye size={20} color={theme.colors.textSecondary} />
                  }
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Hide Balances
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                    Hide all balance information
                  </Text>
                </View>
              </View>
              <Switch
                value={hideBalances}
                onValueChange={setHideBalances}
                thumbColor={hideBalances ? theme.colors.accentFrom : '#FFFFFF'}
                trackColor={{ 
                  false: theme.colors.chip, 
                  true: `${theme.colors.accentFrom}40` 
                }}
              />
            </View>
          </Card>
        </View>
        
        {/* Localization Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Localization
          </Text>
          <Card style={styles.card}>
            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Globe size={20} color={theme.colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Language
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                    English
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Pressable>
            
            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <DollarSign size={20} color={theme.colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Currency
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                    {currency}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </Card>
        </View>
        
        {/* Other Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Other
          </Text>
          <Card style={styles.card}>
            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Shield size={20} color={theme.colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Security
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                    Manage security settings
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Pressable>
            
            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Bell size={20} color={theme.colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Notifications
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                    Manage notification preferences
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Pressable>
            
            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <RefreshCw size={20} color={theme.colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Reset Demo Data
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                    Reset all demo data to defaults
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Pressable>
            
            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Info size={20} color={theme.colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    About
                  </Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
                    App version and info
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    // Dynamic padding applied via contentContainerStyle
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  card: {
    padding: 20,
    borderRadius: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  themeOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});