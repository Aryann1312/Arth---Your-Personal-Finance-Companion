/**
 * @file drawerConfig.js
 * @description Centralized configuration for the side navigation drawer:
 * - Menu items config (label, icon, route/target)
 * - Aryan Desale team profile data and external links
 */

export const DRAWER_MENU_ITEMS = [
  {
    id: 'features',
    label: 'Features',
    sublabel: 'Engineered for Financial Accuracy',
    icon: 'sparkles-outline',
    target: 'AppInfo',
    section: 'features'
  },
  {
    id: 'howItWorks',
    label: 'How it Works',
    sublabel: '4 transparent calculation steps',
    icon: 'git-network-outline',
    target: 'AppInfo',
    section: 'howItWorks'
  },
  {
    id: 'faq',
    label: 'FAQ',
    sublabel: 'Regulatory & calculation clarity',
    icon: 'help-circle-outline',
    target: 'AppInfo',
    section: 'faq'
  }
];

export const TEAM_DATA = {
  name: 'Aryan Desale',
  initials: 'AD',
  role: 'Creator & Developer',
  links: [
    {
      id: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/aryan-desale-18330a377/',
      icon: 'logo-linkedin',
      color: '#0A66C2'
    },
    {
      id: 'github',
      label: 'GitHub',
      url: 'https://github.com/Aryann1312',
      icon: 'logo-github',
      color: '#111111'
    }
  ]
};
