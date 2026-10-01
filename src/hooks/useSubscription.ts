import { useState, useEffect, useCallback } from 'react';
import { subscriptionApi, CurrentSubscriptionDTO } from '../services/subscriptionApi';
import { authApi } from '../services/authApi';

export function useSubscription() {
  const [subscription, setSubscription] = useState<CurrentSubscriptionDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSubscription = useCallback(async () => {
    if (!authApi.isAuthenticated()) {
      setSubscription({
        isPro: false,
        status: 'FREE',
      });
      setIsLoading(false);
      return;
    }

    try {
      const sub = await subscriptionApi.getCurrentSubscription();
      setSubscription(sub);
      // Synchronize in-memory/cache for offline
      if (sub?.isPro) {
        localStorage.setItem('brandx_pro_status', JSON.stringify({ isPro: true }));
      } else {
        localStorage.setItem('brandx_pro_status', JSON.stringify({ isPro: false }));
      }
    } catch {
      // If network fails, default to strict free unless proven otherwise
      setSubscription((prev) => prev || { isPro: false, status: 'FREE' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();

    const handleSubUpdate = () => {
      fetchSubscription();
    };

    window.addEventListener('brandx_subscription_updated', handleSubUpdate);
    window.addEventListener('storage', handleSubUpdate);

    return () => {
      window.removeEventListener('brandx_subscription_updated', handleSubUpdate);
      window.removeEventListener('storage', handleSubUpdate);
    };
  }, [fetchSubscription]);

  const isPro = Boolean(subscription?.isPro && subscription?.status === 'ACTIVE');

  return {
    isPro,
    status: subscription?.status || 'FREE',
    plan: subscription?.plan,
    expiryDate: subscription?.expiryDate || subscription?.currentPeriodEnd,
    isLoading,
    refetch: fetchSubscription,
  };
}
