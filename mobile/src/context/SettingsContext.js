/**
 * @file SettingsContext.js
 * @description Context for user preferences: motion reduction, default lender settings,
 * and purity defaults.
 */

import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [defaultPurity, setDefaultPurity] = useState('22K');
  const [defaultLenderId, setDefaultLenderId] = useState('psu-bank-standard');

  function toggleReduceMotion() {
    setReduceMotion(prev => !prev);
  }

  const value = {
    reduceMotion,
    toggleReduceMotion,
    defaultPurity,
    setDefaultPurity,
    defaultLenderId,
    setDefaultLenderId
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
