/**
 * @file GoldPriceCalculator.js
 * @description Real-time Gold Price Calculator component for estimating gold value
 * by custom weight (in grams) and selected purity (24K, 22K, 18K).
 * Reuses existing luxury design tokens, PearlCard, Input, and AnimatedNumber.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { PearlCard } from './PearlCard.js';
import { Input } from './Input.js';
import { AnimatedNumber } from './AnimatedNumber.js';
import { COLORS, RADII, SPACING, formatINR } from '../theme/index.js';

const CARAT_OPTIONS = [
  { id: '24K', label: '24K', factor: 24 / 24, sub: '99.9%' },
  { id: '22K', label: '22K', factor: 22 / 24, sub: '91.6%' },
  { id: '18K', label: '18K', factor: 18 / 24, sub: '75.0%' }
];

export function GoldPriceCalculator({ goldPricePerGram24K = 0, style }) {
  const [weight, setWeight] = useState('');
  const [selectedCarat, setSelectedCarat] = useState('24K');

  // Input validation: allow numbers with up to one decimal point and at most 4 decimals
  const handleWeightChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 4) return;
    setWeight(cleaned);
  };

  // Carat selection handler with light haptics
  const handleCaratSelect = (caratId) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Graceful fallback on unsupported environments
    }
    setSelectedCarat(caratId);
  };

  // Calculation logic:
  // pricePerGram = 24K price per gram * (carat / 24)
  // totalPrice = pricePerGram * weight
  const rate24K = Number(goldPricePerGram24K) || 0;
  const currentOption = CARAT_OPTIONS.find((c) => c.id === selectedCarat) || CARAT_OPTIONS[0];
  const pricePerGram = rate24K * currentOption.factor;

  const numericWeight = parseFloat(weight);
  const validWeight = !isNaN(numericWeight) && numericWeight > 0 ? numericWeight : 0;
  const totalPrice = validWeight * pricePerGram;

  return (
    <PearlCard goldTrim={true} style={[styles.card, style]}>
      <Text style={styles.cardTitle}>Gold Price Calculator</Text>

      {/* Input A: Weight of Gold (Numeric, decimal allowed) */}
      <View style={styles.inputGroup}>
        <Input
          label="Weight of Gold"
          value={weight}
          onChangeText={handleWeightChange}
          placeholder="e.g. 10"
          keyboardType="decimal-pad"
          suffix="grams"
          returnKeyType="done"
        />
      </View>

      {/* Input B: Carat Selector Chips (24K, 22K, 18K) */}
      <View style={styles.inputGroup}>
        <Text style={styles.fieldLabel}>Carat of Gold</Text>
        <View style={styles.caratToggleRow}>
          {CARAT_OPTIONS.map((carat) => {
            const isSelected = selectedCarat === carat.id;
            return (
              <TouchableOpacity
                key={carat.id}
                onPress={() => handleCaratSelect(carat.id)}
                activeOpacity={0.7}
                style={[
                  styles.caratBtn,
                  isSelected && styles.caratBtnActive
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${carat.label} purity`}
              >
                <Text style={[styles.caratBtnText, isSelected && styles.caratBtnTextActive]}>
                  {carat.label}
                </Text>
                <Text style={[styles.caratBtnSub, isSelected && styles.caratBtnSubActive]}>
                  {carat.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Output Display: Total Price in INR */}
      <View style={styles.resultCard}>
        <Text style={styles.resultHeaderLabel}>Calculated Price</Text>
        <View style={styles.resultValueRow}>
          <AnimatedNumber
            value={totalPrice}
            style={styles.resultValueText}
            isCurrency={true}
          />
        </View>
        {rate24K > 0 ? (
          <Text style={styles.resultBasisText}>
            Based on today's {selectedCarat} rate of {formatINR(pricePerGram)}/g
          </Text>
        ) : (
          <Text style={styles.resultBasisText}>
            Fetching live benchmark rate...
          </Text>
        )}
      </View>
    </PearlCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  inputGroup: {
    marginBottom: SPACING.sm
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6
  },
  caratToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADII.md,
    padding: 3,
    gap: 4
  },
  caratBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.sm
  },
  caratBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)'
  },
  caratBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  caratBtnTextActive: {
    color: COLORS.goldDeep,
    fontWeight: '800'
  },
  caratBtnSub: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 1
  },
  caratBtnSubActive: {
    color: COLORS.goldDeep,
    fontWeight: '700'
  },
  resultCard: {
    backgroundColor: '#FAF5EE',
    borderRadius: RADII.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    alignItems: 'center'
  },
  resultHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  resultValueRow: {
    marginVertical: 4,
    alignItems: 'center'
  },
  resultValueText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.goldDeep,
    letterSpacing: -0.5
  },
  resultBasisText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15
  }
});
