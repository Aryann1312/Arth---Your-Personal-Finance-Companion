/**
 * @file methodologyData.js
 * @description Centralized, audit-transparent data methodology constants for the Arth Gold platform.
 * Decouples content copy from presentation components for maintainability.
 */

export const METHODOLOGY_DATA = {
  header: {
    badge: 'Audit-Ready & Verified',
    title: 'Data Source & Methodology',
    subtitle: 'Transparent, traceable market benchmarks calculated with complete data integrity.'
  },

  primaryProvider: {
    step: '1',
    title: 'Primary Provider: WGC & LBMA',
    subtitle: 'London Bullion Market Association official fixings',
    description:
      'Historical and benchmark gold prices are ingested from the London Bullion Market Association (LBMA) official fixing series published via the World Gold Council (Goldhub).',
    facts: [
      {
        id: 'coverage',
        icon: 'calendar-outline',
        label: 'Historical Coverage',
        value: '5+ Years (2019 – 2026)'
      },
      {
        id: 'frequency',
        icon: 'time-outline',
        label: 'Fixing Frequency',
        value: 'Daily Settlement PM Fix'
      },
      {
        id: 'licensing',
        icon: 'shield-checkmark-outline',
        label: 'Licensing Terms',
        value: 'Public Reference Dataset'
      }
    ],
    linkUrl: 'https://www.gold.org/goldhub/data/gold-prices',
    linkText: 'Visit World Gold Council Goldhub'
  },

  formulaSection: {
    step: '2',
    title: 'Derivation Formula: Spot to INR',
    subtitle: 'Mathematical international XAU/USD to INR conversion',
    formulaLines: [
      'INR / gram =',
      '  (XAU_USD / 31.1034768)',
      '  × USD_INR',
      '  × PurityFactor'
    ],
    weightConversionNote: '1 Troy Ounce = 31.1034768 grams',
    purityFactors: [
      { carat: '24K', factor: '0.999', label: 'Fine Gold', percentage: '99.9%' },
      { carat: '22K', factor: '0.916', label: 'Hallmark', percentage: '91.6%' },
      { carat: '18K', factor: '0.750', label: 'Jewellery', percentage: '75.0%' }
    ],
    fxSourceNote: 'USD/INR conversions use RBI / FBIL daily official reference rates.'
  },

  retailDifferenceSection: {
    step: '3',
    title: 'Why Spot Differs from Retail',
    subtitle: 'Indian customs tariffs, GST, and domestic jeweller markups',
    description:
      'International spot converted directly to INR represents the raw, un-tariffed bullion commodity value. Showroom jewellers in India price retail items based on statutory tariffs:',
    tariffs: [
      {
        id: 'bcd',
        rate: '6.0%',
        title: 'Basic Customs Duty (BCD)',
        tag: 'Union Budget July 2024',
        detail: 'Statutory import duty on fine bullion imported into Indian territory.'
      },
      {
        id: 'gst',
        rate: '3.0%',
        title: 'Goods & Services Tax (GST)',
        tag: 'Domestic Retail Tax',
        detail: 'Mandatory central and state GST levied on all retail jewellery purchases.'
      },
      {
        id: 'premium',
        rate: '1.0%',
        title: 'Local Bullion Premium',
        tag: 'IBJA Wholesale Benchmark',
        detail: 'Refining, domestic vaulting, freight, and local market association margin.'
      }
    ],
    disclaimer:
      'All derived benchmark rates in this application are clearly designated "Indicative derived spot (ex-customs & GST)" to guarantee complete data honesty and compliance.'
  },

  footer: {
    lastVerified: 'Last Verified: October 2026',
    auditBadge: 'LBMA PM Fix • RBI Reference Rate • Union Budget 2024 Compliant'
  }
};
