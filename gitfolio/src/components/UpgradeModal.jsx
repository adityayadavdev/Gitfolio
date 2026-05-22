import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import usePremium from '../hooks/usePremium';
import { createOrder, openRazorpayCheckout } from '../services/payment';
import { Button, Badge } from '../components/ui';

const FEATURES = [
  'Export portfolio as PDF (placement-ready)',
  'All repos shown (not just top 5)',
  'Resume keyword alignment tool',
  'Detailed language depth percentiles',
  'College leaderboard ranking',
  'Custom shareable link',
];

const UpgradeModal = () => {
  const { user } = useAuth();
  const { isUpgradeModalOpen, closeUpgradeModal, activate } = usePremium();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isUpgradeModalOpen) return null;

  const handlePayment = async (plan) => {
    setIsProcessing(true);
    try {
      const orderData = await createOrder(plan);
      const paymentResponse = await openRazorpayCheckout(orderData, user);

      // Polling for license
      const orderId = paymentResponse.razorpay_order_id;
      let licenseKey = null;
      let attempts = 0;
      const maxAttempts = 22;

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/license/by-order?order_id=${orderId}`);
          const data = await response.json();
          if (data.licenseKey) {
            licenseKey = data.licenseKey;
            break;
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }

      if (licenseKey) {
        const success = await activate(licenseKey);
        if (success) {
          // In a real app, we'd use a toast library here
          alert('Premium activated! 🎉');
          closeUpgradeModal();
        } else {
          throw new Error('License activation failed');
        }
      } else {
        throw new Error('Payment is processing. If you were charged, your premium will activate within 5 minutes. Refresh the page to check.');
      }
    } catch (error) {
      console.error('Payment flow error:', error);
      if (error !== 'dismissed') {
        alert(error instanceof Error ? error.message : 'Payment failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={closeUpgradeModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <Badge className="mb-4 px-3 py-1 text-xs font-medium text-green-400 bg-green-400/10 border-green-400/20">
                Go Premium
              </Badge>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Unlock your full portfolio potential
              </h2>
            </div>

            <div className="space-y-4 mb-8">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-zinc-400">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs">
                    ✓
                  </span>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <Button
                onClick={() => handlePayment('monthly')}
                disabled={isProcessing}
                className="h-14 text-lg font-semibold transition-all hover:scale-105"
                variant="outline"
              >
                ₹299/month
              </Button>
              <Button
                onClick={() => handlePayment('lifetime')}
                disabled={isProcessing}
                className="h-14 text-lg font-semibold transition-all hover:scale-105"
              >
                ₹999 one-time — Best Value
              </Button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-zinc-500">
                Payments via Razorpay. Secure. Refundable within 48 hours.
              </p>
              <p className="text-xs font-medium text-zinc-400">
                Used by 500+ developers
              </p>
            </div>
          </div>
          
          <button 
            onClick={closeUpgradeModal}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradeModal;
