/**
 * @file LandingScreen.js
 * @description Streamlined luxury fintech Landing Screen for logged-out visitors.
 *
 * Layout Structure (per visual specifications):
 * - Fixed Top Header: Gold app logo on left, 3D golden "Login" button on top right, separated by a crisp divider.
 * - Section 1: Hero with gold logo, authentic gold badge, main title, updated subtitle, and Live Gold Price card (24K & 22K).
 * - Section 2: Interactive Mini-Model (clean, spacious, readable with bold input titles and live EMI calculations).
 * - Section 3: Final Call-To-Action Gold Banner ("Ready for Financial Clarity?") & Footer with Sign In / Sign Up navigation.
 *
 * Note: Features grid, How It Works, Data Transparency, and FAQ Accordion are preserved as exported
 * helper components in this file for reuse inside the main application.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Font from 'expo-font';
import { PearlCard } from '../../components/PearlCard.js';
import { GoldButton } from '../../components/GoldButton.js';
import { GoldGradientText } from '../../components/GoldGradientText.js';
import { SliderInput } from '../../components/SliderInput.js';
import { AnimatedNumber } from '../../components/AnimatedNumber.js';
import { AppLogo } from '../../components/AppLogo.js';
import { ShinyButton } from '../../components/ui/ShinyButton.js';
import { COLORS, RADII, SPACING, formatINR, useResponsiveLayout } from '../../theme/index.js';

import { calculateEMI } from '../../lib/calc/emi.js';
import { useGoldPrice } from '../../context/GoldPriceContext.js';
import { logger } from '../../services/eventLogger.js';

// Safe local asset reference for Yeseva One font
let localYesevaFont = null;
try {
  localYesevaFont = require('../../../assets/fonts/YesevaOne_400Regular.ttf');
} catch (e) {
  // fallback if asset not resolved
}

export function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { isTablet, horizontalPadding } = useResponsiveLayout();
  const { goldPrice } = useGoldPrice();

  const [isFontReady, setIsFontReady] = useState(() => {
    try {
      return Font.isLoaded('YesevaOne_400Regular');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isFontReady && localYesevaFont) {
      Font.loadAsync({ YesevaOne_400Regular: localYesevaFont })
        .then(() => setIsFontReady(true))
        .catch(() => { });
    }
  }, [isFontReady]);

  // Full-screen viewport height for the initial section (Hero + Live Price Card)
  // Ensures Section 1 fills the opening view exactly, so Mini-Model appears only when scrolling
  const initialViewportHeight = Math.max(
    580,
    windowHeight - insets.top - 62 - (insets.bottom || 16)
  );

  // Interactive Mini-Demo state
  const [demoAmount, setDemoAmount] = useState('500000');
  const [demoRate, setDemoRate] = useState('10.0');
  const [demoTenureYears, setDemoTenureYears] = useState('5');

  useEffect(() => {
    logger.logAction({
      module: 'landing',
      action: 'view_landing_page',
      screen: 'LandingScreen'
    });
  }, []);

  // Compute live mini-demo EMI
  const demoEmiResult = calculateEMI({
    principal: Number(demoAmount) || 0,
    annualRate: Number(demoRate) || 0,
    tenureMonths: (Number(demoTenureYears) || 1) * 12
  });

  return (
    <View style={styles.screen}>
      {/* ========================================================
          TOP HEADER BAR (Pinned at top with 3D Golden Login Button)
          ======================================================== */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarLeft}>
          <AppLogo size={36} variant="gold" />
        </View>

        {/* Animated Shiny Golden Login Button */}
        <ShinyButton
          label="Login"
          onPress={() => navigation.navigate('Login')}
          fillColor="#141312"
          labelColor="#FAF8F5"
          accentColor="#D4AF37"
          accentSoftColor="#FDEAB0"
          sweepDuration={3}
          cornerRadius={10}
          accessibilityLabel="Login"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding
          }
        ]}
      >
        <View style={[styles.contentContainer, isTablet && styles.tabletContainer]}>
          {/* ========================================================
              SECTION 1: HERO & LIVE GOLD PRICE CARD (Picture 1)
              Takes the complete opening viewport (Mini-model hidden until scrolled)
              ======================================================== */}
          <View style={[styles.firstScreenSection, { minHeight: initialViewportHeight }]}>
            <View style={styles.heroSection}>
              <View style={styles.heroLogoWrapper}>
                <AppLogo size={78} variant="gold" />
              </View>

              <Text
                allowFontScaling={false}
                style={[
                  styles.heroAppName,
                  {
                    fontFamily: isFontReady ? 'YesevaOne_400Regular' : (Platform.OS === 'ios' ? 'Georgia' : 'serif')
                  }
                ]}
              >
                Arth
              </Text>

              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>FINTECH PRECISION • AUTHENTIC GOLD</Text>
              </View>

              <GoldGradientText level={1} style={styles.heroTitle}>
                Gold Valuation & Loan Intelligence
              </GoldGradientText>

              {/* User-specified description */}
              {/*<Text style={styles.heroTagline}>
                Accurate Gold Insights, Transparent Loan Calculations, and Smarter EMI Planning.
              </Text>*/}
            </View>

            {/* Clean, Spacious & High-Readability Live Market Price Card */}
            <View style={styles.livePriceCard}>
              <View style={styles.tickerHeader}>
                <View style={styles.statusDotRow}>
                  <View style={[styles.statusDot, !goldPrice?.isLive && styles.statusDotStale]} />
                  <Text style={[styles.statusText, !goldPrice?.isLive && styles.statusTextStale]}>
                    {goldPrice?.isLive ? 'LIVE MARKET' : (goldPrice?.statusLabel || 'DAILY SETTLEMENT')}
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
                  Source: {goldPrice?.sourceName || 'World Gold Council & LBMA with RBI reference rates'} • As of: {goldPrice?.asOfIST || 'Daily Market Settlement'}
                </Text>
              </View>
            </View>
          </View>

          {/* ========================================================
              SECTION 2: INTERACTIVE MINI-MODEL (Picture 2)
              Spacious, readable, with bold titles on every input
              ======================================================== */}
          <View style={styles.miniModelCard}>
            <View style={styles.miniDemoHeader}>
              <Text style={styles.miniDemoTitle}>Interactive Mini-Model</Text>
              <Text style={styles.miniDemoSubtitle}>
                Real-time loan repayment and amortized monthly installment preview
              </Text>
            </View>

            <SliderInput
              label="Loan Principal"
              labelStyle={styles.boldInputTitle}
              value={demoAmount}
              onValueChange={setDemoAmount}
              min={50000}
              max={2500000}
              step={25000}
              prefix="₹"
              quickOptions={['200000', '500000']}
              style={styles.spaciousInputItem}
            />

            <SliderInput
              label="Annual Rate"
              labelStyle={styles.boldInputTitle}
              value={demoRate}
              onValueChange={setDemoRate}
              min={5.0}
              max={20.0}
              step={0.5}
              suffix="%"
              quickOptions={['8.5', '10.0']}
              style={styles.spaciousInputItem}
            />

            <SliderInput
              label="Loan Tenure"
              labelStyle={styles.boldInputTitle}
              value={demoTenureYears}
              onValueChange={setDemoTenureYears}
              min={1}
              max={15}
              step={1}
              suffix="Yrs"
              quickOptions={['2', '5', '7', '10']}
              style={styles.spaciousInputItem}
            />

            <View style={styles.miniDemoResultBox}>
              <View style={styles.miniDemoResultContainer}>
                <Text style={styles.miniDemoResultLabel}>Monthly Installment</Text>
                <AnimatedNumber
                  value={demoEmiResult.emi}
                  isCurrency={true}
                  style={styles.miniDemoResultNumber}
                />
              </View>
            </View>

            <Text style={styles.miniModelFooterNote}>
              LOGIN to unlock personalized insights, saved calculations, gold price history, and advanced financial tools.
            </Text>
          </View>

          {/* ========================================================
              SECTION 3: FINAL CALL-TO-ACTION BANNER & FOOTER (Picture 3)
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
        </View>
      </ScrollView>
    </View>
  );
}

// =========================================================================
// PRESERVED CODEBASE MODULES (For inside main app reuse - NOT displayed on Landing)
// =========================================================================

/**
 * 3-Card Feature Grid: Gold Price Tracker, Gold Loan Calculator, Precision EMI Engine
 */
export function FeaturesSection({ isTablet }) {
  return (
    <View>
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
    </View>
  );
}

/**
 * 4-Step How It Works Process
 */
export function HowItWorksSection() {
  const steps = [
    { step: '01', title: 'Input Collateral & Purity', desc: 'Specify net weight and hallmark (18K, 22K, 24K) with real-time regulatory limit validation.' },
    { step: '02', title: 'Market Benchmark Valuation', desc: 'Intrinsic value is derived from live LBMA and official RBI daily reference conversion rates.' },
    { step: '03', title: 'Tiered LTV Eligibility', desc: 'Applies regulatory caps (85% up to ₹2.5L, 80% up to ₹5L, 75% above) to compute eligible credit.' },
    { step: '04', title: 'Repayment & Amortization', desc: 'Model bullet interest, standard EMI, or prepayment scenarios with exact paise schedule reconciliation.' }
  ];

  return (
    <View>
      <View style={styles.sectionHeaderBox}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.sectionSubtitle}>Four transparent steps from valuation to approval</Text>
      </View>

      <View style={styles.stepsContainer}>
        {steps.map((item, idx) => (
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
    </View>
  );
}

/**
 * Commitment to Data Transparency
 */
export function DataTransparencySection() {
  return (
    <PearlCard style={styles.transparencyCard}>
      <Text style={styles.transparencyTitle}>Commitment to Data Honesty</Text>
      <Text style={styles.transparencyBody}>
        We never fabricate prices, user statistics, or approval guarantees. Gold prices are derived from World Gold Council (Goldhub) & LBMA datasets converted via official RBI reference exchange rates. Indicative international benchmark prices (before duty and GST) are clearly distinguished from local jewellery retail rates that include 6% Basic Customs Duty (as of Union Budget July 2024) and 3% domestic GST.
      </Text>
    </PearlCard>
  );
}

/**
 * FAQ Accordion Section
 */
export function FaqAccordionSection() {
  const [expandedFaq, setExpandedFaq] = useState(null);

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
    <View>
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
    </View>
  );
}

// =========================================================================
// STYLES
// =========================================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF8F5'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1A1815',
    zIndex: 100
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  scrollContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl
  },
  contentContainer: {
    width: '100%'
  },
  tabletContainer: {
    maxWidth: 720,
    alignSelf: 'center'
  },
  firstScreenSection: {
    width: '100%',
    justifyContent: 'space-between',
    paddingTop: 18, // Reduced space above the logo
    paddingBottom: 28 // Clean margin at bottom of initial viewport
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 0
  },
  heroLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1
  },
  heroAppName: {
    fontSize: 55, // Bigger app name in Yeseva One
    color: '#111111',
    textAlign: 'center',
    letterSpacing: 2.5,
    marginTop: 1,
    marginBottom: 26 // Equal spacing above the badge
  },
  heroBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    marginBottom: 12
  },
  heroBadgeText: {
    fontSize: 9, // Reduced size
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 0.7
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: 26 // Equal spacing below the title to live market price card
  },
  heroTagline: {
    fontSize: 12,
    color: '#2B2823',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 16,
    maxWidth: 450,
    paddingHorizontal: 20
  },
  livePriceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22, // Increased padding for spacious luxury feel
    borderWidth: 1,
    borderColor: '#EAE6DF',
    shadowColor: '#1A1815',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  tickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2EB'
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
    backgroundColor: '#16A34A'
  },
  statusDotStale: {
    backgroundColor: '#EAB308'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  statusTextStale: {
    color: '#CA8A04'
  },
  tickerCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777268'
  },
  tickerRatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  rateCol: {
    flex: 1
  },
  ratePurityLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4A463F',
    marginBottom: 8 // increased space above rate
  },
  rateNumber: {
    fontSize: 25,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: 0.2,
    marginBottom: 6 // increased space below rate
  },
  rateTenGram: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#7C766B'
  },
  tickerDivider: {
    width: 1,
    height: 52,
    backgroundColor: '#EAE6DF',
    marginHorizontal: 16
  },
  tickerBasisContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F2EEE6',
    paddingTop: 16,
    marginTop: 18 // increased space above basis section
  },
  tickerBasisLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8A6D1A',
    marginBottom: 4
  },
  tickerDisclaimer: {
    fontSize: 10.5,
    color: '#827D73',
    lineHeight: 16
  },
  miniModelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#EAE6DF',
    shadowColor: '#1A1815',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 20,
    marginBottom: SPACING.xxl
  },
  miniDemoHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  miniDemoTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111111',
    textAlign: 'center',
    letterSpacing: 0.3
  },
  miniDemoSubtitle: {
    fontSize: 13,
    color: '#666158',
    marginTop: 4,
    textAlign: 'center'
  },
  boldInputTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111111'
  },
  spaciousInputItem: {
    marginBottom: 18
  },
  miniDemoResultBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: '#EAE6DF',
    marginTop: SPACING.md
  },
  miniDemoResultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  miniDemoResultLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#666158',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.6,
    marginBottom: 4
  },
  miniDemoResultNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111111',
    textAlign: 'center'
  },
  miniModelFooterNote: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#666158',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 8
  },
  ctaBanner: {
    marginTop: SPACING.xl,
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
    marginTop: SPACING.xxl,
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: '#EAE6DF'
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111'
  },
  footerCopyright: {
    fontSize: 11,
    color: '#888379',
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
    color: '#8A6D1A'
  },
  footerDot: {
    color: '#888379'
  },

  // Preserved Module Styles (Features, How it works, FAQs)
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
  }
});
