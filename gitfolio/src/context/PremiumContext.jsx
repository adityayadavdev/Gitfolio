import React, { createContext, useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { activateLicense } from '../services/payment.js';

export const PremiumContext = createContext();

export const PremiumProvider = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [plan, setPlan] = useState('lifetime');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const activate = async (licenseKey) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/premium/status`, {
        headers: {
          'x-license-key': licenseKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isPremium) {
          // Store license key in Dexie
          await db.premium.put({
            licenseKey,
            tier: data.tier || 'lifetime',
            activatedAt: Date.now(),
          });
          setIsPremium(true);
          setPlan(data.tier || 'lifetime');
          return true;
        }
      }
    } catch (error) {
      console.error('Error activating license:', error);
    }
    return false;
  };

  const openUpgradeModal = () => setIsUpgradeModalOpen(true);
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

  return (
    <PremiumContext.Provider value={{ isPremium, setIsPremium, plan, setPlan, isUpgradeModalOpen, activate, openUpgradeModal, closeUpgradeModal }}>
      {children}
    </PremiumContext.Provider>
  );
};
