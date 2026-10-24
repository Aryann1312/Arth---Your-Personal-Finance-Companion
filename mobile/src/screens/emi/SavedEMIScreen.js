/**
 * @file SavedEMIScreen.js
 * @description List of user's persisted EMI calculations with recall and delete actions
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { PearlCard } from '../../components/PearlCard.js';
import { Skeleton } from '../../components/Skeleton.js';
import { apiRequest } from '../../services/api.js';
import { COLORS, RADII, SPACING, formatINR } from '../../theme/index.js';

export function SavedEMIScreen({ navigation }) {
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCalculations = async () => {
    try {
      const res = await apiRequest('/calculations/my?type=emi');
      if (res && res.calculations) {
        setCalculations(res.calculations);
      }
    } catch (err) {
      console.warn('[SavedEMI] Fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalculations();
  }, []);

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Calculation',
      'Are you sure you want to delete this saved calculation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/calculations/${id}`, { method: 'DELETE' });
              setCalculations(prev => prev.filter(c => c._id !== id));
            } catch (err) {
              Alert.alert('Delete failed', err.message);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={calculations}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={100} />
              <Skeleton height={100} />
            </View>
          ) : (
            <PearlCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Saved EMI Calculations</Text>
              <Text style={styles.emptySub}>Saved calculations from the EMI Calculator will appear here.</Text>
            </PearlCard>
          )
        }
        renderItem={({ item }) => (
          <PearlCard goldTrim={true} style={styles.calcCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.label}>{item.label}</Text>
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailsRow}>
              <View>
                <Text style={styles.detailSub}>Principal: {formatINR(item.inputs?.principal)}</Text>
                <Text style={styles.detailSub}>Tenure: {item.inputs?.tenureMonths} Months ({item.inputs?.annualRate}%)</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.emiLabel}>Monthly EMI</Text>
                <Text style={styles.emiValue}>{formatINR(item.results?.emi)}</Text>
              </View>
            </View>

            <Text style={styles.dateText}>
              Saved: {new Date(item.createdAt).toLocaleDateString('en-IN')}
            </Text>
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
  listContent: {
    padding: SPACING.lg
  },
  calcCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  deleteText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600'
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SPACING.xs
  },
  detailSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  emiLabel: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  emiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.xs
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
