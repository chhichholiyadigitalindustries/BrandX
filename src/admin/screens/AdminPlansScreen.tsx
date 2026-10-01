/**
 * BRANDX Admin Subscription Plans Management Screen (/admin/plans)
 * Configurable SaaS pricing tiers, feature gates, limits, and subscriber metrics.
 */

import React, { useEffect, useState } from 'react';
import { planService } from '../services/planService';
import { SubscriptionPlan } from '../types/payment';
import { useAdminToast } from '../components/AdminToast';

export const AdminPlansScreen: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Create Plan Modal State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({});

  const { showToast } = useAdminToast();

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const data = await planService.getPlans();
      setPlans(data);
    } catch (e) {
      showToast('Error loading subscription plans', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleEditClick = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsCreatingNew(false);
    setFormData({
      name: plan.name,
      price: plan.price,
      originalPrice: plan.originalPrice,
      billingCycle: plan.billingCycle,
      tagline: plan.tagline,
      status: plan.status,
      limits: { ...plan.limits },
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await planService.updatePlan(editingPlan.id, formData);
        showToast('Plan pricing & feature limits updated! ✅', 'success');
      } else if (isCreatingNew) {
        await planService.createPlan({
          name: formData.name || 'New Tier Plan',
          code: (formData.name || 'custom').toLowerCase().replace(/\s+/g, '_'),
          price: formData.price || 299,
          originalPrice: formData.originalPrice || 499,
          currency: 'INR',
          billingCycle: formData.billingCycle || 'monthly',
          tagline: formData.tagline || 'Custom features for retailers',
          features: ['Custom Features', 'Full Branding', 'Priority Support'],
          limits: formData.limits || {
            invoices: 'unlimited',
            posters: 'unlimited',
            aiCredits: 200,
            digitalDukaan: true,
            removeWatermark: true,
            customBranding: true,
            prioritySupport: true,
            nfcSmartCard: false,
          },
          status: 'active',
        });
        showToast('New subscription plan created! 🚀', 'success');
      }
      setEditingPlan(null);
      setIsCreatingNew(false);
      loadPlans();
    } catch (e) {
      showToast('Failed to save plan', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="font-extrabold text-white text-base tracking-tight">SaaS Subscription Plans &amp; Pricing</h2>
          <p className="text-xs text-gray-400">Configure feature limits, prices, billing cycles, and subscriber quotas</p>
        </div>

        <button
          onClick={() => {
            setEditingPlan(null);
            setIsCreatingNew(true);
            setFormData({
              name: '',
              price: 299,
              originalPrice: 599,
              billingCycle: 'monthly',
              tagline: '',
              status: 'active',
              limits: {
                invoices: 'unlimited',
                posters: 'unlimited',
                aiCredits: 100,
                digitalDukaan: true,
                removeWatermark: true,
                customBranding: true,
                prioritySupport: true,
                nfcSmartCard: false,
              },
            });
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#005338] to-[#008f62] hover:brightness-110 text-white text-xs font-extrabold shadow-md border border-emerald-400/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Create New Tier</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isFree = plan.price === 0;
          return (
            <div
              key={plan.id}
              className={`bg-[#0E1424] border rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all hover:scale-[1.01] ${
                plan.isPopular
                  ? 'border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                  : 'border-white/10'
              }`}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="mb-4">
                  <h3 className="font-extrabold text-lg text-white">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.tagline}</p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 mb-6 pb-4 border-b border-white/10">
                  <span className="text-3xl font-black text-white font-mono">
                    {isFree ? 'FREE' : `₹${plan.price}`}
                  </span>
                  {!isFree && (
                    <>
                      {plan.originalPrice && plan.originalPrice > plan.price && (
                        <span className="text-xs text-gray-500 line-through font-mono">
                          ₹{plan.originalPrice}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-semibold capitalize">
                        / {plan.billingCycle}
                      </span>
                    </>
                  )}
                </div>

                {/* Performance Metrics for Admin */}
                <div className="grid grid-cols-2 gap-2 mb-6 p-3 rounded-2xl bg-white/5 border border-white/5 text-center text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Active Subscribers</span>
                    <span className="font-bold text-white text-sm">{plan.subscribersCount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Revenue Generated</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ₹{plan.revenueGenerated.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Feature Limits List */}
                <div className="space-y-2 mb-6">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Features &amp; Limits</p>
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                      <span>GST Invoices: <strong className="text-white capitalize">{String(plan.limits.invoices)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                      <span>Posters: <strong className="text-white capitalize">{String(plan.limits.posters)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                      <span>AI Voice Prompts: <strong className="text-white capitalize">{String(plan.limits.aiCredits)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${plan.limits.removeWatermark ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {plan.limits.removeWatermark ? 'check_circle' : 'cancel'}
                      </span>
                      <span>Remove Brand Watermark</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${plan.limits.digitalDukaan ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {plan.limits.digitalDukaan ? 'check_circle' : 'cancel'}
                      </span>
                      <span>Digital Dukaan &amp; WhatsApp Store</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${plan.limits.nfcSmartCard ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {plan.limits.nfcSmartCard ? 'check_circle' : 'cancel'}
                      </span>
                      <span>NFC Smart Visiting Card</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Action */}
              <button
                onClick={() => handleEditClick(plan)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit Pricing &amp; Features</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Plan Modal */}
      {(editingPlan || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0E1424] border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-extrabold text-base text-white">
                {isCreatingNew ? 'Create New Pricing Tier' : `Edit Plan: ${editingPlan?.name}`}
              </h3>
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreatingNew(false);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Plan Display Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Pro Monthly (VIP)"
                  className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Offer Price (₹ INR)</label>
                  <input
                    type="number"
                    value={formData.price ?? 199}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Original Cut Price (₹ INR)</label>
                  <input
                    type="number"
                    value={formData.originalPrice ?? 399}
                    onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Billing Cycle</label>
                  <select
                    value={formData.billingCycle || 'monthly'}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-bold"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                    <option value="free">Free Forever</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Plan Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-bold"
                  >
                    <option value="active">Active &amp; Visible</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Short Tagline / Hook</label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. All-in-one power kit for growing retail shops"
                  className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Feature Toggles */}
              <div className="pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Feature Entitlements</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits?.removeWatermark || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits!, removeWatermark: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-500"
                    />
                    <span>No Watermark</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits?.digitalDukaan || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits!, digitalDukaan: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-500"
                    />
                    <span>Digital Dukaan</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits?.customBranding || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits!, customBranding: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-500"
                    />
                    <span>Custom Branding</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.limits?.nfcSmartCard || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits!, nfcSmartCard: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-500"
                    />
                    <span>NFC Smart Card</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(null);
                    setIsCreatingNew(false);
                  }}
                  className="flex-1 h-11 rounded-xl bg-white/10 text-gray-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
