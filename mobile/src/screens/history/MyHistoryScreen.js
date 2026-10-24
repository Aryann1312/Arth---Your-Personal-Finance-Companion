/**
 * @file MyHistoryScreen.js
 * @description Personal activity and calculation history screen allowing users
 * to review, filter, and inspect their own interactions.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { PearlCard } from '../../components/PearlCard.js';
import { Skeleton } from '../../components/Skeleton.js';
import { apiRequest } from '../../services/api.js';
import { COLORS, RADII, SPACING } from '../../theme/index.js';

export function MyHistoryScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [selectedModule, setSelectedModule] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadHistory = async (mod = selectedModule) => {
    setLoading(true);
    try {
      const query = mod === 'all' ? '' : `?module=${mod}`;
      const res = await apiRequest(`/events/my-history${query}`);
      if (res && res.events) {
        setEvents(res.events);
      }
    } catch (err) {
      console.warn('[MyHistory] Fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(selectedModule);
  }, [selectedModule]);

  const modules = [
    { id: 'all', label: 'All History' },
    { id: 'gold_loan', label: 'Gold Loan' },
    { id: 'emi', label: 'EMI' },
    { id: 'gold_prices', label: 'Gold Rates' }
  ];

  return (
    <View style={styles.screen}>
      {/* Module Filter Pills */}
      <View style={styles.filterBar}>
        {modules.map(m => {
          const isSelected = selectedModule === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => setSelectedModule(m.id)}
              style={[styles.filterPill, isSelected && styles.filterPillSelected]}
            >
              <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={events}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={80} />
              <Skeleton height={80} />
              <Skeleton height={80} />
            </View>
          ) : (
            <PearlCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Activity Logged Yet</Text>
              <Text style={styles.emptySub}>Interactions and calculations in the app will appear in your timeline.</Text>
            </PearlCard>
          )
        }
        renderItem={({ item }) => (
          <PearlCard style={styles.eventCard}>
            <View style={styles.eventHeaderRow}>
              <View style={styles.moduleBadge}>
                <Text style={styles.moduleBadgeText}>{item.module}</Text>
              </View>
              <Text style={styles.timestampText}>
                {new Date(item.timestamp).toLocaleString('en-IN')}
              </Text>
            </View>

            <Text style={styles.actionText}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
            <Text style={styles.screenText}>Screen: {item.screen}</Text>

            {item.resultSummary && Object.keys(item.resultSummary).length > 0 && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Summary Snapshot:</Text>
                <Text style={styles.summaryContent}>{JSON.stringify(item.resultSummary, null, 2)}</Text>
              </View>
            )}
          </PearlCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  filterPillSelected: {
    backgroundColor: COLORS.goldLightBg,
    borderColor: COLORS.goldMain
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  filterPillTextSelected: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  listContent: {
    padding: SPACING.lg
  },
  eventCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  moduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted
  },
  moduleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldDeep,
    textTransform: 'uppercase'
  },
  timestampText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  screenText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6
  },
  summaryBox: {
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  summaryContent: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xxl
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center'
  }
});
