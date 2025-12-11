import React, { useState, useEffect } from 'react';

const TIER_COLORS = {
  hope: 'bg-green-100 text-green-800',
  essential: 'bg-blue-100 text-blue-800',
  growth: 'bg-purple-100 text-purple-800',
  impact: 'bg-orange-100 text-orange-800',
  impact_enterprise: 'bg-red-100 text-red-800',
  custom: 'bg-gray-100 text-gray-800'
};

export default function BillingManagement({ clientId, isAdmin = false }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [referenceData, setReferenceData] = useState(null);
  const [settings, setSettings] = useState({
    subscription_tier: 'hope',
    client_category: 'individual',
    ministry_discount: '',
    hardship_discount: '',
    pro_bono: false,
    grace_period_months: 0,
    grace_period_start: '',
    billing_notes: '',
    billing_status: 'active'
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const refRes = await fetch('/api/billing/reference-data');
      const refData = await refRes.json();
      setReferenceData(refData);
      
      if (clientId) {
        const clientRes = await fetch(`/api/billing/client/${clientId}`);
        if (clientRes.ok) {
          const clientData = await clientRes.json();
          setSettings({
            ...settings,
            ...clientData,
            pro_bono: clientData.pro_bono === 1
          });
        }
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/billing/client/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Saved!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    if (!isAdmin) return;
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const totalDiscount = () => {
    let d = 0;
    if (settings.ministry_discount) d += parseFloat(settings.ministry_discount) || 0;
    if (settings.hardship_discount) d += parseFloat(settings.hardship_discount) || 0;
    return Math.min(d, 100);
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6 animate-pulse"><div className="h-6 bg-gray-200 rounded w-1/3"></div></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div 
        className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-white">
          <h3 className="font-semibold text-lg">Billing and Subscription</h3>
          <p className="text-indigo-100 text-sm">{isAdmin ? 'Admin Controls' : 'Your Plan'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${TIER_COLORS[settings.subscription_tier]}`}>
          {settings.subscription_tier?.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {expanded && (
        <div className="p-6 space-y-6">
          {message && (
            <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          {settings.pro_bono && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <strong>Pro Bono Client</strong> - All services provided at no charge
            </div>
          )}

          {settings.grace_period_months > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <strong>{settings.grace_period_months} Month Grace Period Active</strong>
              {settings.grace_period_start && ` - Started: ${settings.grace_period_start}`}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                {isAdmin ? (
                  <select value={settings.subscription_tier} onChange={(e) => handleChange('subscription_tier', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg">
                    {referenceData?.subscriptionTiers?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className={`px-4 py-2 rounded-lg ${TIER_COLORS[settings.subscription_tier]}`}>
                    {settings.subscription_tier?.replace('_', ' ').toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Category</label>
                {isAdmin ? (
                  <select value={settings.client_category} onChange={(e) => handleChange('client_category', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg">
                    {referenceData?.clientCategories?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border">{settings.client_category}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Status</label>
                {isAdmin ? (
                  <select value={settings.billing_status} onChange={(e) => handleChange('billing_status', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="grace_period">Grace Period</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border">{settings.billing_status}</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ministry Discount (%)</label>
                {isAdmin ? (
                  <input type="text" value={settings.ministry_discount} onChange={(e) => handleChange('ministry_discount', e.target.value)}
                    placeholder="e.g., 15" className="w-full px-3 py-2 border rounded-lg" />
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border">{settings.ministry_discount ? `${settings.ministry_discount}%` : 'None'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hardship Discount (%)</label>
                {isAdmin ? (
                  <input type="text" value={settings.hardship_discount} onChange={(e) => handleChange('hardship_discount', e.target.value)}
                    placeholder="e.g., 25" className="w-full px-3 py-2 border rounded-lg" />
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border">{settings.hardship_discount ? `${settings.hardship_discount}%` : 'None'}</div>
                )}
              </div>

              {(settings.ministry_discount || settings.hardship_discount) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <strong>Total Discount:</strong> {totalDiscount()}%
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period</label>
                {isAdmin ? (
                  <div className="flex gap-2">
                    <select value={settings.grace_period_months} onChange={(e) => handleChange('grace_period_months', parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 border rounded-lg">
                      {referenceData?.gracePeriods?.map(g => (
                        <option key={g.months} value={g.months}>{g.label}</option>
                      ))}
                    </select>
                    {settings.grace_period_months > 0 && (
                      <input type="date" value={settings.grace_period_start} onChange={(e) => handleChange('grace_period_start', e.target.value)}
                        className="px-3 py-2 border rounded-lg" />
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg border">
                    {settings.grace_period_months > 0 ? `${settings.grace_period_months} months` : 'None'}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <input type="checkbox" id="pro_bono" checked={settings.pro_bono} onChange={(e) => handleChange('pro_bono', e.target.checked)}
                    className="w-5 h-5" />
                  <label htmlFor="pro_bono" className="cursor-pointer"><strong>Pro Bono Client</strong></label>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Notes (Admin Only)</label>
                <textarea value={settings.billing_notes} onChange={(e) => handleChange('billing_notes', e.target.value)}
                  placeholder="Internal notes..." rows={3} className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div className="border-t pt-4 flex justify-end">
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Billing Settings'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}