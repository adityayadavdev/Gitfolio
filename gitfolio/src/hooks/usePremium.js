import { useContext, useState, useEffect } from 'react';
import { PremiumContext } from '../context/PremiumContext';
import { db } from '../services/db.js';

const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }

  const { setIsPremium, setPlan } = context;
  const [isPremiumLoading, setIsPremiumLoading] = useState(true);

  useEffect(() => {
    const verifyPremiumStatus = async () => {
      try {
        const premiumEntry = await db.premium.toArray();
        if (premiumEntry.length > 0) {
          const { licenseKey } = premiumEntry[0];
          const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/premium/status`, {
            headers: {
              'x-license-key': licenseKey,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.isPremium) {
              setIsPremium(true);
              if (data.tier) {
                setPlan(data.tier);
              }
            } else {
              await db.premium.clear();
              setIsPremium(false);
            }
          } else {
            await db.premium.clear();
            setIsPremium(false);
          }
        }
      } catch (error) {
        console.error('Error verifying premium status:', error);
      } finally {
        setIsPremiumLoading(false);
      }
    };

    verifyPremiumStatus();
  }, [setIsPremium, setPlan]);

  return {
    ...context,
    isPremiumLoading,
  };
};

export default usePremium;
