import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccent } from '../../theme/useAccent';
import { Card } from '../../components/Card';
import { GradientPillButton } from '../../components/GradientPillButton';
import { ArrowLeft, Bell, Plus, TrendingUp, TrendingDown, X } from 'lucide-react-native';

interface PriceAlertsContentProps {
  onBack: () => void;
}

export default function PriceAlertsContent({ onBack }: PriceAlertsContentProps) {
  const { theme } = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    asset: 'BTC',
    condition: 'above',
    price: '',
    notification: 'push',
  });
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  const alerts = [
    {
      id: '1',
      asset: 'BTC',
      condition: 'above',
      price: '$70,000',
      currentPrice: '$67,890',
      status: 'active',
      time: '2h ago',
    },
    {
      id: '2',
      asset: 'ETH',
      condition: 'below',
      price: '$2,200',
      currentPrice: '$2,380',
      status: 'active',
      time: '4h ago',
    },
    {
      id: '3',
      asset: 'SOL',
      condition: 'above',
      price: '$200',
      currentPrice: '$185',
      status: 'triggered',
      time: '1d ago',
    },
  ];

  const assets = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'UNI', 'AAVE'];

  const renderAlertCard = (alert: any) => (
    <Card key={alert.id} style={[styles.alertCard, { backgroundColor: theme.colors.chip }]}>
      <View style={styles.alertHeader}>
        <View style={styles.alertInfo}>
          <Text style={[styles.alertAsset, { color: theme.colors.textPrimary }]}>
            {alert.asset}
          </Text>
          <View style={[styles.alertCondition, { 
            backgroundColor: alert.condition === 'above' ? theme.colors.positive : theme.colors.negative 
          }]}>
            <Text style={styles.alertConditionText}>
              {alert.condition === 'above' ? '↗' : '↘'}
            </Text>
          </View>
        </View>
        <View style={[styles.alertStatus, { 
          backgroundColor: alert.status === 'active' ? theme.colors.positive : theme.colors.blue 
        }]}>
          <Text style={styles.alertStatusText}>
            {alert.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={[styles.alertDetails, isMobile && styles.alertDetailsMobile]}>
        <View style={styles.alertDetail}>
          <Text style={[styles.alertLabel, { color: theme.colors.textSecondary }]}>
            Target Price
          </Text>
          <Text style={[styles.alertValue, { color: theme.colors.textPrimary }]}>
            {alert.price}
          </Text>
        </View>
        <View style={styles.alertDetail}>
          <Text style={[styles.alertLabel, { color: theme.colors.textSecondary }]}>
            Current Price
          </Text>
          <Text style={[styles.alertValue, { color: theme.colors.textPrimary }]}>
            {alert.currentPrice}
          </Text>
        </View>
        <View style={styles.alertDetail}>
          <Text style={[styles.alertLabel, { color: theme.colors.textSecondary }]}>
            Time
          </Text>
          <Text style={[styles.alertValue, { color: theme.colors.textSecondary }]}>
            {alert.time}
          </Text>
        </View>
      </View>

      <View style={styles.alertFooter}>
        <View style={styles.alertToggle}>
          <Switch
            value={alert.status === 'active'}
            onValueChange={() => {}}
            trackColor={{ false: theme.colors.textSecondary, true: theme.colors.positive }}
            thumbColor={alert.status === 'active' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text style={[styles.alertToggleText, { color: theme.colors.textSecondary }]}>
            Enable
          </Text>
        </View>
        <Pressable style={styles.deleteButton}>
          <X size={16} color={theme.colors.negative} />
        </Pressable>
      </View>
    </Card>
  );

  if (showAddAlert) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Add Alert Header */}
          <View style={styles.addAlertHeader}>
            <Text style={[styles.addAlertTitle, { color: theme.colors.textPrimary }]}>
              Add Price Alert
            </Text>
            <Pressable onPress={() => setShowAddAlert(false)} style={styles.closeButton}>
              <X size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Asset Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Select Asset
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetScroll}>
              {assets.map((asset) => (
                <Pressable
                  key={asset}
                  onPress={() => setNewAlert({ ...newAlert, asset })}
                  style={[
                    styles.assetButton,
                    { backgroundColor: theme.colors.chip },
                    newAlert.asset === asset && { backgroundColor: accent.from }
                  ]}
                >
                  <Text style={[
                    styles.assetText,
                    { color: newAlert.asset === asset ? '#FFFFFF' : theme.colors.textPrimary }
                  ]}>
                    {asset}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Condition Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Alert Condition
            </Text>
            <View style={[styles.conditionGrid, isMobile && styles.conditionGridMobile]}>
              <Pressable
                onPress={() => setNewAlert({ ...newAlert, condition: 'above' })}
                style={[
                  styles.conditionButton,
                  { backgroundColor: theme.colors.chip },
                  newAlert.condition === 'above' && { backgroundColor: theme.colors.positive }
                ]}
              >
                <TrendingUp size={20} color={newAlert.condition === 'above' ? '#FFFFFF' : theme.colors.positive} />
                <Text style={[
                  styles.conditionText,
                  { color: newAlert.condition === 'above' ? '#FFFFFF' : theme.colors.textPrimary }
                ]}>
                  Price Above
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setNewAlert({ ...newAlert, condition: 'below' })}
                style={[
                  styles.conditionButton,
                  { backgroundColor: theme.colors.chip },
                  newAlert.condition === 'below' && { backgroundColor: theme.colors.negative }
                ]}
              >
                <TrendingDown size={20} color={newAlert.condition === 'below' ? '#FFFFFF' : theme.colors.negative} />
                <Text style={[
                  styles.conditionText,
                  { color: newAlert.condition === 'below' ? '#FFFFFF' : theme.colors.textPrimary }
                ]}>
                  Price Below
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Price Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Target Price
            </Text>
            <Card style={[styles.inputCard, { backgroundColor: theme.colors.chip }]}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Enter target price
              </Text>
              <Text style={[styles.inputValue, { color: theme.colors.textPrimary }]}>
                $0.00
              </Text>
            </Card>
          </View>

          {/* Notification Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Notification Type
            </Text>
            <Card style={[styles.notificationCard, { backgroundColor: theme.colors.chip }]}>
              <View style={styles.notificationItem}>
                <Bell size={20} color={theme.colors.textPrimary} />
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationTitle, { color: theme.colors.textPrimary }]}>
                    Push Notification
                  </Text>
                  <Text style={[styles.notificationDescription, { color: theme.colors.textSecondary }]}>
                    Get notified instantly on your device
                  </Text>
                </View>
                <Switch
                  value={newAlert.notification === 'push'}
                  onValueChange={(value) => setNewAlert({ ...newAlert, notification: value ? 'push' : 'email' })}
                  trackColor={{ false: theme.colors.textSecondary, true: theme.colors.positive }}
                  thumbColor={newAlert.notification === 'push' ? '#FFFFFF' : theme.colors.textSecondary}
                />
              </View>
            </Card>
          </View>

          {/* Create Alert Button */}
          <GradientPillButton
            onPress={() => setShowAddAlert(false)}
            colors={[accent.from, accent.to]}
            style={styles.createAlertButton}
          >
            <Bell size={20} color="#FFFFFF" />
            <Text style={styles.createAlertButtonText}>Create Alert</Text>
          </GradientPillButton>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Price Alerts
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Set price alerts to never miss important market movements
          </Text>
        </View>

        {/* Add Alert Button */}
        <View style={styles.section}>
          <GradientPillButton
            onPress={() => setShowAddAlert(true)}
            colors={[accent.from, accent.to]}
            style={styles.addAlertButton}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addAlertButtonText}>Add Price Alert</Text>
          </GradientPillButton>
        </View>

        {/* Alerts List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Your Alerts
          </Text>
          {alerts.length > 0 ? (
            alerts.map(renderAlertCard)
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: theme.colors.chip }]}>
              <Bell size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No alerts set
              </Text>
              <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
                Create your first price alert to stay informed about market movements
              </Text>
            </Card>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Alert Statistics
          </Text>
          <Card style={[styles.statsCard, { backgroundColor: theme.colors.chip }]}>
            <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.positive }]}>
                  {alerts.filter(a => a.status === 'active').length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Active Alerts
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.blue }]}>
                  {alerts.filter(a => a.status === 'triggered').length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Triggered Today
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {alerts.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Total Alerts
                </Text>
              </View>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
  addAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  addAlertTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    padding: 8,
  },
  assetScroll: {
    marginBottom: 8,
  },
  assetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  assetText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  conditionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  conditionGridMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  conditionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  inputCard: {
    padding: 16,
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  inputValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  notificationCard: {
    padding: 16,
    borderRadius: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  createAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  createAlertButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  addAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
  },
  addAlertButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  alertCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertAsset: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  alertCondition: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertConditionText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  alertStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  alertDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertDetailsMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  alertDetail: {
    alignItems: 'center',
  },
  alertLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  alertValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertToggleText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsCard: {
    padding: 16,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsGridMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});