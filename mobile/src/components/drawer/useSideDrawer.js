/**
 * @file useSideDrawer.js
 * @description Hook managing side drawer open/close state, timing animations,
 * and hardware back button listeners.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated, Easing, BackHandler } from 'react-native';

export function useSideDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 320,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [animValue]);

  const closeDrawer = useCallback((onComplete) => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 280,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setIsOpen(false);
        if (onComplete && typeof onComplete === 'function') {
          onComplete();
        }
      }
    });
  }, [animValue]);

  const toggleDrawer = useCallback(() => {
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isOpen, closeDrawer, openDrawer]);

  // Android hardware back button handler
  useEffect(() => {
    if (!isOpen) return;

    const onBackPress = () => {
      closeDrawer();
      return true; // prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [isOpen, closeDrawer]);

  return {
    isOpen,
    animValue,
    openDrawer,
    closeDrawer,
    toggleDrawer
  };
}
