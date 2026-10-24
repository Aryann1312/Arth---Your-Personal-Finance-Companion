/**
 * @file LandingScreen.js
 * @description Long-scroll luxury fintech Landing Screen for logged-out visitors.
 * Features all 8 specification sections: Hero, Live Gold Ticker, Feature Grid,
 * Interactive Mini-Demo, How It Works, Data Transparency, FAQ Accordion, and CTA Banner.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PearlCard } from '../../components/PearlCard.js';
import { GoldButton } from '../../components/GoldButton.js';
import { GoldGradientText } from '../../components/GoldGradientText.js';
import { SliderInput } from '../../components/SliderInput.js';
import { AnimatedNumber } from '../../components/AnimatedNumber.js';
import { AppLogo } from '../../components/AppLogo.js';
import { COLORS, RADII, SPACING, formatINR, useResponsiveLayout } from '../../theme/index.js';

import { calculateEMI } from '../../lib/calc/emi.js';
import { useGoldPrice } from '../../context/GoldPriceContext.js';
import { logger } from '../../services/eventLogger.js';

export function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isTablet, horizontalPadding } = useResponsiveLayout();
  const { goldPrice, loading: tickerLoading } = useGoldPrice();

  // Section 4: Interactive Mini-Demo state
  const [demoAmount, setDemoAmount] = useState('500000');
  const [demoRate, setDemoRate] = useState('10.0');
  const [demoTenureYears, setDemoTenureYears] = useState('5');

  // Section 7: FAQ Accordion state
  const [expandedFaq, setExpandedFaq] = useState(null);

  useEffect(() => {
    logger.logAction({
      module: 'landing',
      action: 'view_landing_page',
      screen: 'LandingScreen'
    });
  }, []);

  // Compute mini-demo EMI live
  const demoEmiResult = calculateEMI({
    principal: Number(demoAmount) || 0,
    annualRate: Number(demoRate) || 0,
    tenureMonths: (Number(demoTenureYears) || 1) * 12
  });

  const faqs = [
    {
      q: 'How is the India gold price derived?',
      a: 'We convert genuine LBMA/London spot gold prices (XAU/USD) to INR using official RBI daily USD/INR reference rates. It reflects indicative international commodity value before Indian Basic Customs Duty (~6% as of Union Budget July 2024) and 3% domestic GST.'
    },
    {
      q: 'How does the RBI tiered LTV rule work?',
      a: 'Under regulatory lending directions, eligible LTV is non-circularly capped: loans up to ₹2.5 Lakh receive up to 85% LTV, loans above ₹2.5 Lakh up to ₹5 Lakh receive up to 80% LTV, and loans above ₹5 Lakh receive up to 75% LTV.'
    },
    {
      q: 'Why does the EMI schedule adjust the final installment?',
      a: 'All monthly interest is calculated down to exact integer paise. To ensure exact mathematical reconciliation, the final installment absorbs fractional rounding paise so the ending balance hits ₹0.00 precisely.'
    },
    {
      q: 'Is my calculation history saved privately?',
      a: 'Calculations are tied to your account and stored in the database, where they are also visible to system administrators for audit and support purposes. You can export your data or delete your account at any time.'
    }
  ];

  return (
    <View style={styles.screen}>
      {/* Pearl-coloured Status Bar Scrim with Safe Area Top Padding (1.5) */}
      <View style={[styles.statusBarScrim, { height: insets.top }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: insets.top + SPACING.md
          }
        ]}
      >
        
        {/* ========================================================
            SECTION 1: HERO
            ======================================================== */}
        <View style={[styles.heroSection, isTablet && styles.tabletHero]}>
          <View style={styles.heroLogoWrapper}>
            <AppLogo size={74} variant="gold" />
          </View>

          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>FINTECH PRECISION • AUTHENTIC GOLD</Text>
          </View>

          <GoldGradientText level={1} style={styles.heroTitle}>
            Gold Valuation & Loan Intelligence
          </GoldGradientText>

          <Text style={styles.heroTagline}>
            Transparent calculations for bullion rates, RBI regulatory tiered gold loans, and precision EMI amortization schedules.
          </Text>

          {/* Shimmering Hero Buttons */}
          <View style={styles.heroButtonsRow}>
            <GoldButton
              title="Get Started (Sign Up)"
              variant="primary"
              onPress={() => navigation.navigate('SignUp')}
              style={{ minWidth: 170 }}
            />
            <GoldButton
              title="Sign In"
              variant="secondary"
              onPress={() => navigation.navigate('Login')}
              style={{ minWidth: 130 }}
            />
          </View>
        </View>

        {/* ========================================================
            SECTION 2: LIVE GOLD TICKER
            ======================================================== */}
        <PearlCard goldTrim={true} style={styles.tickerCard}>
          <View style={styles.tickerHeader}>
            <View style={styles.statusDotRow}>
              <View style={[styles.statusDot, (!goldPrice?.isLive) && styles.statusDotStale]} />
              <Text style={[styles.statusText, (!goldPrice?.isLive) && styles.statusTextStale]}>
                {goldPrice?.isLive ? 'LIVE' : (goldPrice?.statusLabel || 'Last updated IST')}
              </Text>
            </View>
            <Text style={styles.tickerCurrency}>India (INR / gram)</Text>
          </View>

          <View style={styles.tickerRatesRow}>
            <View style={styles.rateCol}>
              <Text style={styles.ratePurityLabel}>24K Fine Gold (99.9%)</Text>
              <Text style={styles.rateNumber}>
                {goldPrice?.inrPerGram?.['24K'] ? formatINR(goldPrice.inrPerGram['24K']) : 'Unavailable'}
              </Text>
              <Text style={styles.rateTenGram}>
                {goldPrice?.inrPer10g?.['24K'] ? `${formatINR(goldPrice.inrPer10g['24K'])} / 10g` : 'Rate unavailable'}
              </Text>
            </View>

            <View style={styles.tickerDivider} />

            <View style={styles.rateCol}>
              <Text style={styles.ratePurityLabel}>22K Standard Hallmark (91.6%)</Text>
              <Text style={styles.rateNumber}>
                {goldPrice?.inrPerGram?.['22K'] ? formatINR(goldPrice.inrPerGram['22K']) : 'Unavailable'}
              </Text>
              <Text style={styles.rateTenGram}>
                {goldPrice?.inrPer10g?.['22K'] ? `${formatINR(goldPrice.inrPer10g['22K'])} / 10g` : 'Rate unavailable'}
              </Text>
            </View>
          </View>

          <View style={styles.tickerBasisContainer}>
            <Text style={styles.tickerBasisLabel}>
              Basis: {goldPrice?.basisLabel || 'Indicative benchmark, before duty and GST'}
            </Text>
            <Text style={styles.tickerDisclaimer}>
              Source: {goldPrice?.sourceName || 'World Gold Council (Goldhub) & LBMA with RBI reference rates'} • As of: {goldPrice?.asOfIST || 'Daily Market Settlement'}
            </Text>
          </View>
        </PearlCard>

        {/* ========================================================
            SECTION 3: FEATURES (THREE CARDS)
            ======================================================== */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Engineered for Financial Accuracy</Text>
          <Text style={styles.sectionSubtitle}>Three dedicated calculation modules</Text>
        </View>

        <View style={[styles.featuresGrid, isTablet && styles.tabletFeaturesGrid]}>
          <PearlCard style={styles.featureCard}>
            <View style={styles.featureIconBadge}>
              <Text style={styles.featureIcon}>📈</Text>
            </View>
            <Text style={styles.featureTitle}>Gold Price Tracker</Text>
            <Text style={styles.featureDesc}>
              5-year verified daily trading history, date-to-date comparisons, and honest trading gap reporting.
            </Text>
          </PearlCard>

          <PearlCard style={styles.featureCard}>
            <View style={styles.featureIconBadge}>
              <Text style={styles.featureIcon}>⚖️</Text>
            </View>
            <Text style={styles.featureTitle}>Gold Loan Calculator</Text>
            <Text style={styles.featureDesc}>
              RBI tiered LTV caps (85%, 80%, 75%), collateral limits (1kg/50g), and bullet vs EMI repayment modeling.
            </Text>
          </PearlCard>

          <PearlCard style={styles.featureCard}>
            <View style={styles.featureIconBadge}>
              <Text style={styles.featureIcon}>🧮</Text>
            </View>
            <Text style={styles.featureTitle}>Precision EMI Engine</Text>
            <Text style={styles.featureDesc}>
              Exact integer paise compounding, lump-sum/recurring prepayment impact, and 360+ row CSV export.
            </Text>
          </PearlCard>
        </View>

        {/* ========================================================
            SECTION 4: INTERACTIVE MINI-DEMO
            ======================================================== */}
        <PearlCard goldTrim={true} style={styles.miniDemoCard}>
          <View style={styles.miniDemoHeader}>
            <Text style={styles.miniDemoTitle}>Interactive Mini-Demo</Text>
            <Text style={styles.miniDemoSubtitle}>Test our instant real-time EMI recalculation</Text>
          </View>

          <SliderInput
            label="Loan Principal"
            value={demoAmount}
            onValueChange={setDemoAmount}
            min={50000}
            max={2500000}
            step={25000}
            prefix="₹"
            quickOptions={['200000', '500000', '1000000']}
          />

          <SliderInput
            label="Annual Rate"
            value={demoRate}
            onValueChange={setDemoRate}
            min={5.0}
            max={20.0}
            step={0.5}
            suffix="%"
            quickOptions={['8.5', '10.0', '12.0']}
          />

          <SliderInput
            label="Tenure"
            value={demoTenureYears}
            onValueChange={setDemoTenureYears}
            min={1}
            max={15}
            step={1}
            suffix="Yrs"
            quickOptions={['2', '5', '7', '10']}
          />

          <View style={styles.miniDemoResultBox}>
            <View>
              <Text style={styles.miniDemoResultLabel}>Monthly Installment</Text>
              <AnimatedNumber
                value={demoEmiResult.emi}
                isCurrency={true}
                style={styles.miniDemoResultNumber}
              />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.miniDemoTotalLabel}>Total Repayment</Text>
              <Text style={styles.miniDemoTotalValue}>{formatINR(demoEmiResult.totalPayment)}</Text>
            </View>
          </View>
        </PearlCard>

        {/* ========================================================
            SECTION 5: HOW IT WORKS
            ======================================================== */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>Four transparent steps from valuation to approval</Text>
        </View>

        <View style={styles.stepsContainer}>
          {[
            { step: '01', title: 'Input Collateral & Purity', desc: 'Specify net weight and hallmark (18K, 22K, 24K) with real-time regulatory limit validation.' },
            { step: '02', title: 'Market Benchmark Valuation', desc: 'Intrinsic value is derived from live LBMA and official RBI daily reference conversion rates.' },
            { step: '03', title: 'Tiered LTV Eligibility', desc: 'Applies regulatory caps (85% up to ₹2.5L, 80% up to ₹5L, 75% above) to compute eligible credit.' },
            { step: '04', title: 'Repayment & Amortization', desc: 'Model bullet interest, standard EMI, or prepayment scenarios with exact paise schedule reconciliation.' }
          ].map((item, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{item.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ========================================================
            SECTION 6: DATA TRANSPARENCY
            ======================================================== */}
        <PearlCard style={styles.transparencyCard}>
          <Text style={styles.transparencyTitle}>Commitment to Data Honesty</Text>
          <Text style={styles.transparencyBody}>
            We never fabricate prices, user statistics, or approval guarantees. Gold prices are derived from World Gold Council (Goldhub) & LBMA datasets converted via official RBI reference exchange rates. Indicative international benchmark prices (before duty and GST) are clearly distinguished from local jewellery retail rates that include 6% Basic Customs Duty (as of Union Budget July 2024) and 3% domestic GST.
          </Text>
        </PearlCard>

        {/* ========================================================
            SECTION 7: FAQ ACCORDION
            ======================================================== */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        </View>

        <View style={styles.faqContainer}>
          {faqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <PearlCard key={idx} style={styles.faqCard}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                  style={styles.faqQuestionRow}
                >
                  <Text style={styles.faqQuestionText}>{faq.q}</Text>
                  <Text style={styles.faqToggleIcon}>{isExpanded ? '−' : '+'}</Text>
                </TouchableOpacity>
                {isExpanded && (
                  <Text style={styles.faqAnswerText}>{faq.a}</Text>
                )}
              </PearlCard>
            );
          })}
        </View>

        {/* ========================================================
            SECTION 8: FINAL CALL-TO-ACTION BANNER & FOOTER
            ======================================================== */}
        <LinearGradient
          colors={COLORS.goldButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBanner}
        >
          <Text style={styles.ctaBannerTitle}>Ready for Financial Clarity?</Text>
          <Text style={styles.ctaBannerSub}>
            Sign up now to save calculations, track 5-year gold trends, and generate custom amortization schedules.
          </Text>
          <GoldButton
            title="Create Free Account"
            variant="dark"
            onPress={() => navigation.navigate('SignUp')}
            style={styles.ctaBannerBtn}
          />
        </LinearGradient>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Gold & Loan Calculator • Mobile Edition</Text>
          <Text style={styles.footerCopyright}>Technical Assessment Implementation • Managed Expo Workflow</Text>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLinkText}>Sign In</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLinkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  statusBarScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#FAF8F5'
  },
  scrollContent: {
    paddingVertical: SPACING.xxl
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: SPACING.xl
  },
  heroLogoWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    marginBottom: SPACING.md
  },
  tabletHero: {
    maxWidth: 800,
    alignSelf: 'center'
  },
  heroBadge: {
    backgroundColor: COLORS.goldLightBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    marginBottom: SPACING.md
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.goldDeep,
    letterSpacing: 0.8
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: SPACING.md
  },
  heroTagline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    maxWidth: 600
  },
  heroButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  tickerCard: {
    marginVertical: SPACING.lg,
    padding: SPACING.lg
  },
  tickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success
  },
  statusDotStale: {
    backgroundColor: COLORS.warning
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.success,
    textTransform: 'uppercase'
  },
  statusTextStale: {
    color: COLORS.warning
  },
  tickerCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tickerRatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs
  },
  rateCol: {
    flex: 1
  },
  ratePurityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  rateNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 2
  },
  rateTenGram: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  tickerDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md
  },
  tickerBasisContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.xs,
    marginTop: SPACING.md
  },
  tickerBasisLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldDeep,
    marginBottom: 2
  },
  tickerDisclaimer: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  sectionHeaderBox: {
    alignItems: 'center',
    marginTop: SPACING.xxxl,
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center'
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center'
  },
  featuresGrid: {
    gap: SPACING.md
  },
  tabletFeaturesGrid: {
    flexDirection: 'row',
    gap: SPACING.md
  },
  featureCard: {
    flex: 1,
    padding: SPACING.lg
  },
  featureIconBadge: {
    width: 44,
    height: 44,
    borderRadius: RADII.md,
    backgroundColor: COLORS.goldLightBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold
  },
  featureIcon: {
    fontSize: 22
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  miniDemoCard: {
    marginTop: SPACING.xxxl,
    padding: SPACING.xl
  },
  miniDemoHeader: {
    marginBottom: SPACING.md
  },
  miniDemoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  miniDemoSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  miniDemoResultBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.goldLightBg,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    marginTop: SPACING.md
  },
  miniDemoResultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase'
  },
  miniDemoResultNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.goldDeep
  },
  miniDemoTotalLabel: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  miniDemoTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  stepsContainer: {
    gap: SPACING.md
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  stepNumberBadge: {
    width: 38,
    height: 38,
    borderRadius: RADII.md,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFD700'
  },
  stepContent: {
    flex: 1
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  transparencyCard: {
    marginTop: SPACING.xxxl,
    padding: SPACING.xl,
    backgroundColor: COLORS.surfaceMuted,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.goldMain
  },
  transparencyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs
  },
  transparencyBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20
  },
  faqContainer: {
    gap: 8
  },
  faqCard: {
    padding: SPACING.md,
    marginBottom: 0
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    paddingRight: 8
  },
  faqToggleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.goldDeep
  },
  faqAnswerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.xs
  },
  ctaBanner: {
    marginTop: SPACING.xxxl,
    padding: SPACING.xxl,
    borderRadius: RADII.xxl,
    alignItems: 'center'
  },
  ctaBannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111111',
    textAlign: 'center',
    marginBottom: SPACING.xs
  },
  ctaBannerSub: {
    fontSize: 13,
    color: '#2B2823',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
    maxWidth: 480
  },
  ctaBannerBtn: {
    minWidth: 200
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xxxl,
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  footerCopyright: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldDeep
  },
  footerDot: {
    color: COLORS.textMuted
  }
});
