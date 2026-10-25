/**
 * @file AdminPortalScreen.js
 * @description Comprehensive in-app Admin Portal for stakeholders.
 * Provides user search & inspection, user activity timeline audit,
 * analytics summary metrics, and CSV activity export.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { PearlCard } from '../../components/PearlCard.js';
import { Input } from '../../components/Input.js';
import { GoldButton } from '../../components/GoldButton.js';
import { Skeleton } from '../../components/Skeleton.js';
import { Toast } from '../../components/Toast.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

import { apiRequest, API_BASE_URL, TokenManager } from '../../services/api.js';

export function AdminPortalScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'activity' | 'analytics'

  // Users State
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Activity Feed State
  const [activityEvents, setActivityEvents] = useState([]);
  const [activityModuleFilter, setActivityModuleFilter] = useState('all');

  // Analytics State
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load Users List
  const loadUsers = async () => {
    setLoading(true);
    try {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const res = await apiRequest(`/admin/users${query}`);
      if (res && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  // Load Activity Feed
  const loadActivityFeed = async (mod = activityModuleFilter) => {
    setLoading(true);
    try {
      const query = mod === 'all' ? '' : `?module=${mod}`;
      const res = await apiRequest(`/admin/activity${query}`);
      if (res && res.events) {
        setActivityEvents(res.events);
      }
    } catch (err) {
      setError(err.message || 'Failed to load activity feed.');
    } finally {
      setLoading(false);
    }
  };

  // Load Analytics Summary
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/analytics');
      if (res && res.analytics) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'activity') loadActivityFeed(activityModuleFilter);
    else if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab]);

  // Inspect User Detail
  const handleInspectUser = async (userId) => {
    try {
      const res = await apiRequest(`/admin/users/${userId}`);
      if (res && res.user) {
        setSelectedUserDetail(res);
        setUserModalVisible(true);
      }
    } catch (err) {
      Alert.alert('User Details Error', err.message);
    }
  };

  // Export Activity CSV
  const handleExportCSV = async () => {
    try {
      const token = await TokenManager.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/admin/export-csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const csvText = await res.text();

      const fileUri = `${FileSystem.documentDirectory}Admin_Activity_Export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvText, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export System Activity Logs CSV'
        });
      } else {
        Alert.alert('Export Complete', `Saved to: ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('CSV Export Failed', err.message);
    }
  };

  return (
    <View style={styles.screen}>
      <Toast message={error} type="error" visible={Boolean(error)} />

      {/* Admin Tab Switcher */}
      <View style={styles.tabBar}>
        {[
          { id: 'users', label: 'Users Directory' },
          { id: 'activity', label: 'Activity Logs' },
          { id: 'analytics', label: 'Analytics' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ========================================================
          TAB 1: USERS DIRECTORY
          ======================================================== */}
      {activeTab === 'users' && (
        <View style={styles.tabContent}>
          <View style={styles.searchBarRow}>
            <View style={{ flex: 1 }}>
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search user by name or email..."
                style={{ marginBottom: 0 }}
              />
            </View>
            <GoldButton
              title="Search"
              variant="dark"
              onPress={loadUsers}
              style={{ marginLeft: 8 }}
            />
          </View>

          <FlatList
            data={users}
            keyExtractor={item => item.id || item._id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <PearlCard style={styles.userCard} onPress={() => handleInspectUser(item.id || item._id)}>
                <View style={styles.userCardHeader}>
                  <Text style={styles.userCardName}>{item.name}</Text>
                  <View style={[styles.userRoleBadge, item.role === 'admin' && styles.userRoleBadgeAdmin]}>
                    <Text style={[styles.userRoleText, item.role === 'admin' && styles.userRoleTextAdmin]}>
                      {item.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.userCardEmail}>{item.email}</Text>

                <View style={styles.userStatsRow}>
                  <Text style={styles.userStatsText}>
                    Saved Calcs: <Text style={styles.bold}>{item.savedCalculationsCount}</Text>
                  </Text>
                  <Text style={styles.userStatsText}>
                    Activity Events: <Text style={styles.bold}>{item.totalActivityEventsCount}</Text>
                  </Text>
                </View>

                <Text style={styles.userCardDate}>
                  Joined: {new Date(item.createdAt).toLocaleDateString('en-IN')}
                </Text>
              </PearlCard>
            )}
          />
        </View>
      )}

      {/* ========================================================
          TAB 2: ACTIVITY FEED
          ======================================================== */}
      {activeTab === 'activity' && (
        <View style={styles.tabContent}>
          <View style={styles.activityHeaderRow}>
            <View style={styles.moduleFiltersRow}>
              {['all', 'gold_loan', 'emi', 'gold_prices', 'auth'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setActivityModuleFilter(m);
                    loadActivityFeed(m);
                  }}
                  style={[styles.filterPill, activityModuleFilter === m && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, activityModuleFilter === m && styles.filterPillTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <GoldButton
              title="Export CSV"
              variant="dark"
              onPress={handleExportCSV}
              style={{ paddingHorizontal: 12, minHeight: 36 }}
            />
          </View>

          <FlatList
            data={activityEvents}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <PearlCard style={styles.eventCard}>
                <View style={styles.eventHeaderRow}>
                  <View style={styles.moduleBadge}>
                    <Text style={styles.moduleBadgeText}>{item.module}</Text>
                  </View>
                  <Text style={styles.eventTimeText}>
                    {new Date(item.timestamp).toLocaleString('en-IN')}
                  </Text>
                </View>

                <Text style={styles.eventActionTitle}>
                  {item.action.replace(/_/g, ' ').toUpperCase()} • {item.screen}
                </Text>

                <Text style={styles.eventUserText}>
                  User: {item.user ? `${item.user.name} (${item.user.email})` : 'Anonymous Visitor'}
                </Text>

                <View style={styles.inputSnapshotBox}>
                  <Text style={styles.snapshotLabel}>Inputs Logged (Audit Transparency):</Text>
                  <Text style={styles.snapshotContent}>
                    {typeof item.inputs === 'string' ? item.inputs : JSON.stringify(item.inputs, null, 2)}
                  </Text>
                </View>

                {item.resultSummary && Object.keys(item.resultSummary).length > 0 && (
                  <View style={[styles.inputSnapshotBox, { marginTop: 6 }]}>
                    <Text style={styles.snapshotLabel}>Result Summary:</Text>
                    <Text style={styles.snapshotContent}>
                      {JSON.stringify(item.resultSummary, null, 2)}
                    </Text>
                  </View>
                )}
              </PearlCard>
            )}
          />
        </View>
      )}

      {/* ========================================================
          TAB 3: ANALYTICS SUMMARY
          ======================================================== */}
      {activeTab === 'analytics' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.analyticsScroll}>
          {analytics && (
            <View>
              <View style={styles.kpiGrid}>
                <PearlCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Total Registered Users</Text>
                  <Text style={styles.kpiNumber}>{analytics.totalUsers}</Text>
                </PearlCard>

                <PearlCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Daily Active Users (24h)</Text>
                  <Text style={[styles.kpiNumber, { color: COLORS.success }]}>{analytics.dailyActiveUsers}</Text>
                </PearlCard>

                <PearlCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Calculations Saved</Text>
                  <Text style={[styles.kpiNumber, { color: COLORS.goldDeep }]}>{analytics.totalCalculationsSaved}</Text>
                </PearlCard>
              </View>

              {/* Module Adoption Breakdown */}
              <PearlCard goldTrim={true} style={{ marginTop: SPACING.md }}>
                <Text style={styles.analyticsCardTitle}>Module Adoption Breakdown</Text>
                {analytics.moduleBreakdown?.map(item => (
                  <View key={item.module} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{item.module.replace(/_/g, ' ').toUpperCase()}</Text>
                    <View style={styles.breakdownBarContainer}>
                      <View style={[styles.breakdownBar, { width: `${item.percentage}%` }]} />
                    </View>
                    <Text style={styles.breakdownValue}>{item.count} ({item.percentage}%)</Text>
                  </View>
                ))}
              </PearlCard>

              {/* Retention Policy Note */}
              <PearlCard style={{ marginTop: SPACING.md, backgroundColor: COLORS.surfaceMuted }}>
                <Text style={styles.retentionTitle}>Data Retention Policy Enforcement</Text>
                <Text style={styles.retentionText}>
                  MongoDB TTL index is active on the activity_events collection (12 months auto-purging). All logged inputs comply with administrative auditability without retaining sensitive credentials.
                </Text>
              </PearlCard>
            </View>
          )}
        </ScrollView>
      )}

      {/* User Detail Inspection Modal */}
      <Modal
        visible={userModalVisible}
        animationType="slide"
        onRequestClose={() => setUserModalVisible(false)}
      >
        {selectedUserDetail && (
          <View style={styles.modalScreen}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Audit Detail</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <PearlCard goldTrim={true}>
                <Text style={styles.modalUserName}>{selectedUserDetail.user.name}</Text>
                <Text style={styles.modalUserEmail}>{selectedUserDetail.user.email}</Text>
                <Text style={styles.modalUserRole}>Role: {selectedUserDetail.user.role.toUpperCase()}</Text>
                <Text style={styles.modalUserDate}>
                  Joined: {new Date(selectedUserDetail.user.createdAt).toLocaleString('en-IN')}
                </Text>
              </PearlCard>

              <Text style={styles.modalSectionTitle}>Saved Calculations ({selectedUserDetail.savedCalculations?.length || 0})</Text>
              {selectedUserDetail.savedCalculations?.map(calc => (
                <PearlCard key={calc._id} style={styles.calcMiniCard}>
                  <Text style={styles.calcMiniLabel}>{calc.label} ({calc.type})</Text>
                  <Text style={styles.calcMiniDate}>{new Date(calc.createdAt).toLocaleDateString('en-IN')}</Text>
                </PearlCard>
              ))}

              <Text style={styles.modalSectionTitle}>Activity Timeline ({selectedUserDetail.activityTimeline?.length || 0})</Text>
              {selectedUserDetail.activityTimeline?.map(evt => (
                <PearlCard key={evt.id} style={styles.timelineMiniCard}>
                  <Text style={styles.timelineAction}>{evt.action.toUpperCase()} • {evt.module}</Text>
                  <Text style={styles.timelineTime}>{new Date(evt.timestamp).toLocaleString('en-IN')}</Text>
                  <Text style={styles.timelineSnapshot}>{JSON.stringify(evt.inputs)}</Text>
                </PearlCard>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabBtnActive: {
    borderBottomColor: COLORS.goldDeep
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tabBtnTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  tabContent: {
    flex: 1
  },
  searchBarRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center'
  },
  listContainer: {
    padding: SPACING.md
  },
  userCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  userRoleBadge: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.sm
  },
  userRoleBadgeAdmin: {
    backgroundColor: '#111111'
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  userRoleTextAdmin: {
    color: '#FFD700'
  },
  userCardEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginVertical: 2
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: SPACING.xs
  },
  userStatsText: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  bold: {
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  userCardDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  moduleFiltersRow: {
    flexDirection: 'row',
    gap: 6
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted
  },
  filterPillActive: {
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 1,
    borderColor: COLORS.goldMain
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  filterPillTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  eventCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  moduleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceMuted
  },
  moduleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  eventTimeText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  eventActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  eventUserText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  inputSnapshotBox: {
    backgroundColor: COLORS.surfaceMuted,
    padding: 8,
    borderRadius: 6,
    marginTop: 6
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  snapshotContent: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  analyticsScroll: {
    padding: SPACING.md
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10
  },
  kpiCard: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center'
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 4
  },
  kpiNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary
  },
  analyticsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  breakdownLabel: {
    width: 90,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  breakdownBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: COLORS.goldMain,
    borderRadius: 5
  },
  breakdownValue: {
    width: 80,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right'
  },
  retentionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  retentionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  modalScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 45
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  modalScroll: {
    padding: SPACING.lg
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  modalUserEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2
  },
  modalUserRole: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldDeep,
    marginTop: 4
  },
  modalUserDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm
  },
  calcMiniCard: {
    padding: SPACING.md,
    marginBottom: SPACING.xs
  },
  calcMiniLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  calcMiniDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  timelineMiniCard: {
    padding: SPACING.md,
    marginBottom: SPACING.xs
  },
  timelineAction: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  timelineTime: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  timelineSnapshot: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
    marginTop: 4
  }
});
