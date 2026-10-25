/**
 * @file ProfileScreen.js
 * @description User Profile management, data export (JSON), account deletion cascade,
 * and navigation to Admin Portal (for admin role).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext.js';
import { PearlCard } from '../../components/PearlCard.js';
import { GoldButton } from '../../components/GoldButton.js';
import { apiRequest } from '../../services/api.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function ProfileScreen({ navigation }) {
  const { user, logout, deleteAccount, isAdmin } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Machine-readable data export
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await apiRequest('/users/export-my-data');
      if (res && res.archive) {
        const jsonString = JSON.stringify(res.archive, null, 2);
        const fileUri = `${FileSystem.documentDirectory}User_Data_Export_${Date.now()}.json`;

        await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Download Your User Data Archive'
          });
        } else {
          Alert.alert('Export Complete', `File saved to: ${fileUri}`);
        }
      }
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Cascade account deletion
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'This will permanently delete your account, all saved calculations, and your entire interaction history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
            } catch (err) {
              Alert.alert('Delete failed', err.message);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Profile Info Card */}
      <PearlCard goldTrim={true} style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
          </Text>
        </View>

        <Text style={styles.userName}>{user?.name || 'Authorized User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'USER'}</Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Member Since:</Text>
          <Text style={styles.metaValue}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '2026-10-24'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Last Session Active:</Text>
          <Text style={styles.metaValue}>
            {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString('en-IN') : 'Active'}
          </Text>
        </View>
      </PearlCard>

      {/* Admin Portal Shortcut (Admins Only) */}
      {isAdmin && (
        <PearlCard style={styles.adminCard}>
          <View style={styles.adminHeaderRow}>
            <Text style={styles.adminTitle}>👑 Stakeholder Admin Portal</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN ROLE</Text>
            </View>
          </View>
          <Text style={styles.adminSub}>
            Inspect all registered users, audit chronological activity timelines, view analytics, and export CSV logs.
          </Text>
          <GoldButton
            title="Open Admin Portal"
            variant="dark"
            onPress={() => navigation.navigate('AdminPortal')}
            style={{ marginTop: SPACING.md }}
          />
        </PearlCard>
      )}

      {/* User Rights & Actions */}
      <PearlCard style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Account & Preferences</Text>

        <TouchableOpacity onPress={() => navigation.navigate('MyHistory')} style={styles.actionRow}>
          <Text style={styles.actionRowText}>📜 My Interaction History</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.actionRow}>
          <Text style={styles.actionRowText}>⚙️ App Settings & Motion</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('PrivacyNotice')} style={styles.actionRow}>
          <Text style={styles.actionRowText}>🔒 Privacy Policy & Data Notice</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleExportData} style={styles.actionRow}>
          <Text style={styles.actionRowText}>📦 Export My Data (JSON)</Text>
          <Text style={styles.chevron}>{isExporting ? '...' : '›'}</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <GoldButton
          title="Sign Out"
          variant="secondary"
          onPress={logout}
          style={{ marginBottom: SPACING.sm }}
        />

        <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Delete Account and All Data</Text>
        </TouchableOpacity>
      </PearlCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: SPACING.lg
  },
  profileCard: {
    alignItems: 'center',
    padding: SPACING.xl
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 2,
    borderColor: COLORS.goldMain,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2
  },
  roleBadge: {
    marginTop: SPACING.xs,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  infoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4
  },
  metaLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  adminCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  adminHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111'
  },
  adminBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.sm
  },
  adminBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800'
  },
  adminSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16
  },
  actionsCard: {
    padding: SPACING.lg
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  chevron: {
    fontSize: 18,
    color: COLORS.textMuted
  },
  actionDivider: {
    height: SPACING.md
  },
  deleteBtn: {
    alignSelf: 'center',
    padding: SPACING.xs,
    marginTop: SPACING.xs
  },
  deleteBtnText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '700'
  }
});
