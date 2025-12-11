import express from 'express';
const router = express.Router();

export default function(db) {
  
  const SUBSCRIPTION_TIERS = [
    { id: 'hope', name: 'Hope', profiles: 1, aiSearches: 10 },
    { id: 'essential', name: 'Essential', profiles: 3, aiSearches: 50 },
    { id: 'growth', name: 'Growth', profiles: 5, aiSearches: 100 },
    { id: 'impact', name: 'Impact', profiles: -1, aiSearches: -1 },
    { id: 'impact_enterprise', name: 'Impact Enterprise', profiles: -1, aiSearches: -1 },
    { id: 'custom', name: 'Custom', profiles: -1, aiSearches: -1 }
  ];
  
  const CLIENT_CATEGORIES = [
    { id: 'individual', name: 'Individual' },
    { id: 'small', name: 'Small Organization' },
    { id: 'midsize', name: 'Mid-Size Organization' },
    { id: 'large', name: 'Large Organization' }
  ];
  
  const GRACE_PERIODS = [
    { months: 0, label: 'None' },
    { months: 1, label: '1 Month' },
    { months: 3, label: '3 Months' },
    { months: 6, label: '6 Months' }
  ];

  router.get('/billing/reference-data', (req, res) => {
    res.json({ subscriptionTiers: SUBSCRIPTION_TIERS, clientCategories: CLIENT_CATEGORIES, gracePeriods: GRACE_PERIODS });
  });

  router.get('/billing/client/:clientId', (req, res) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.clientId);
      if (!client) return res.status(404).json({ error: 'Client not found' });
      client.selected_addons = client.selected_addons ? JSON.parse(client.selected_addons) : [];
      res.json(client);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/billing/client/:clientId', (req, res) => {
    try {
      const { subscription_tier, client_category, ministry_discount, hardship_discount, pro_bono, grace_period_months, grace_period_start, selected_addons, billing_notes, monthly_subscription_amount, billing_status } = req.body;
      
      db.prepare(`UPDATE clients SET subscription_tier=?, client_category=?, ministry_discount=?, hardship_discount=?, pro_bono=?, grace_period_months=?, grace_period_start=?, selected_addons=?, billing_notes=?, monthly_subscription_amount=?, billing_status=? WHERE id=?`).run(
        subscription_tier || 'hope', client_category || 'individual', ministry_discount || '', hardship_discount || '', pro_bono ? 1 : 0, grace_period_months || 0, grace_period_start || '', JSON.stringify(selected_addons || []), billing_notes || '', monthly_subscription_amount || 0, billing_status || 'active', req.params.clientId
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/billing/all-clients', (req, res) => {
    try {
      const clients = db.prepare('SELECT id, name, subscription_tier, client_category, ministry_discount, hardship_discount, pro_bono, grace_period_months, billing_status FROM clients ORDER BY name').all();
      res.json(clients);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}