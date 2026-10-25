/**
 * @file TeamCard.js
 * @description Clean member card for Aryan Desale featuring "AD" gold avatar circle,
 * name, role, and external LinkedIn & GitHub icon buttons with Linking and try/catch.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TEAM_DATA } from './drawerConfig.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function TeamCard({ staggerAnim }) {
  const handleOpenLink = async (url, label) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback on unsupported platforms
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.warn(`[TeamCard] Could not open URL ${url}:`, err);
      Alert.alert('Unable to Open Link', `Could not open ${label} at this time.`);
    }
  };

  const opacity = staggerAnim
    ? staggerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
      })
    : 1;

  const translateY = staggerAnim
    ? staggerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [14, 0]
      })
    : 0;

  return (
    <Animated.View
      style={[
        styles.sectionContainer,
        {
          opacity,
          transform: [{ translateY }]
        }
      ]}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>TEAM</Text>
        <View style={styles.sectionGoldLine} />
      </View>

      <View style={styles.card}>
        <View style={styles.memberRow}>
          {/* Gold Ring Avatar matching NavBar AR avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{TEAM_DATA.initials}</Text>
          </View>

          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{TEAM_DATA.name}</Text>
            <Text style={styles.memberRole}>{TEAM_DATA.role}</Text>
          </View>
        </View>

        {/* Social / Portfolio Links Row */}
        <View style={styles.linksRow}>
          {TEAM_DATA.links.map((link) => (
            <TouchableOpacity
              key={link.id}
              onPress={() => handleOpenLink(link.url, link.label)}
              activeOpacity={0.75}
              style={styles.linkButton}
              accessibilityRole="button"
              accessibilityLabel={`Open Aryan Desale's ${link.label} profile in browser`}
            >
              <Ionicons
                name={link.icon}
                size={16}
                color={COLORS.goldDeep}
                style={styles.linkIcon}
              />
              <Text style={styles.linkLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
    marginTop: SPACING.md
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.goldDeep,
    letterSpacing: 1.2
  },
  sectionGoldLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    marginLeft: SPACING.sm
  },
  card: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)'
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.goldLightBg,
    borderWidth: 1.5,
    borderColor: COLORS.goldMain,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1
  },
  memberName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  memberRole: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  linksRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADII.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  linkIcon: {
    marginRight: 6
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary
  }
});
