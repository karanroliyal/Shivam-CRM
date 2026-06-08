const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper middleware for simulated auth checking (checks header 'x-user-id')
function checkAuth(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. x-user-id header is required.' });
  }
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }
  req.user = user;
  next();
}

function checkAdmin(req, res, next) {
  checkAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
  });
}

// --- Auth APIs ---

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.getUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Log activity
  db.logActivity(user.id, user.name, 'Login', 'Logged in to the CRM');

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered.' });
  }

  const newUser = db.saveUser({
    name,
    email,
    password,
    role: 'user',
    planId: 'plan_free',
    planStatus: 'active',
    planStartDate: new Date().toISOString()
  });

  // Log activity
  db.logActivity(newUser.id, newUser.name, 'Registration', 'Created a new account');

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ user: userWithoutPassword });
});

app.get('/api/auth/me', checkAuth, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

// --- Public / Tenant Plan APIs ---

app.get('/api/plans', (req, res) => {
  const plans = db.getPlans();
  // Admin sees all, users see active only
  const userId = req.headers['x-user-id'];
  const user = userId ? db.getUserById(userId) : null;
  
  if (user && user.role === 'admin') {
    res.json(plans);
  } else {
    res.json(plans.filter(p => p.status === 'active'));
  }
});

// --- User CRM Lead APIs ---

app.get('/api/crm/leads', checkAuth, (req, res) => {
  const leads = db.getLeadsByUserId(req.user.id);
  res.json(leads);
});

app.post('/api/crm/leads', checkAuth, (req, res) => {
  const { name, company, email, phone, budget, status, priority, notes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Lead name is required.' });
  }

  // Check Plan Limits for Free Starter (limit to 15 leads)
  if (req.user.planId === 'plan_free') {
    const leads = db.getLeadsByUserId(req.user.id);
    if (leads.length >= 15) {
      return res.status(403).json({ 
        error: 'Lead limit reached. Free Starter plan is limited to 15 leads. Please upgrade to Growth Pro for unlimited leads!' 
      });
    }
  }

  const newLead = db.saveLead({
    userId: req.user.id,
    name,
    company: company || '',
    email: email || '',
    phone: phone || '',
    budget: Number(budget) || 0,
    status: status || 'New',
    priority: priority || 'Medium',
    notes: notes || ''
  });

  db.logActivity(req.user.id, req.user.name, 'Lead Created', `Added lead "${name}" (${company || 'Individual'})`);
  res.status(201).json(newLead);
});

app.put('/api/crm/leads/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const existingLead = db.getLeadById(id);

  if (!existingLead || existingLead.userId !== req.user.id) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  const updatedLead = db.saveLead({
    ...existingLead,
    ...req.body,
    id,
    userId: req.user.id // Keep user ID unchanged
  });

  // If status changed, log it specifically
  if (req.body.status && req.body.status !== existingLead.status) {
    db.logActivity(
      req.user.id,
      req.user.name,
      'Lead Stage Updated',
      `Moved "${updatedLead.name}" from ${existingLead.status} to ${updatedLead.status}`
    );
  } else {
    db.logActivity(req.user.id, req.user.name, 'Lead Updated', `Updated details for lead "${updatedLead.name}"`);
  }

  res.json(updatedLead);
});

app.delete('/api/crm/leads/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const existingLead = db.getLeadById(id);

  if (!existingLead || existingLead.userId !== req.user.id) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  db.deleteLead(id);
  db.logActivity(req.user.id, req.user.name, 'Lead Deleted', `Removed lead "${existingLead.name}"`);
  res.json({ message: 'Lead deleted successfully.' });
});

// --- User Follow-up APIs ---

app.get('/api/crm/followups', checkAuth, (req, res) => {
  const followups = db.getFollowupsByUserId(req.user.id);
  res.json(followups);
});

app.post('/api/crm/followups', checkAuth, (req, res) => {
  const { leadId, leadName, title, date, time } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: 'Follow-up title and date are required.' });
  }

  const newFollowup = db.saveFollowup({
    userId: req.user.id,
    leadId: leadId || null,
    leadName: leadName || 'General Followup',
    title,
    date,
    time: time || '09:00',
    status: 'pending'
  });

  db.logActivity(req.user.id, req.user.name, 'Follow-up Scheduled', `Scheduled "${title}" for ${date}`);
  res.status(201).json(newFollowup);
});

app.put('/api/crm/followups/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const data = db.getFollowups();
  const followup = data.find(f => f.id === id);

  if (!followup || followup.userId !== req.user.id) {
    return res.status(404).json({ error: 'Follow-up not found.' });
  }

  const updatedFollowup = db.saveFollowup({
    ...followup,
    ...req.body,
    id,
    userId: req.user.id
  });

  if (req.body.status === 'completed' && followup.status !== 'completed') {
    db.logActivity(req.user.id, req.user.name, 'Follow-up Completed', `Completed task: "${followup.title}"`);
  }

  res.json(updatedFollowup);
});

app.delete('/api/crm/followups/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const data = db.getFollowups();
  const followup = data.find(f => f.id === id);

  if (!followup || followup.userId !== req.user.id) {
    return res.status(404).json({ error: 'Follow-up not found.' });
  }

  db.deleteFollowup(id);
  res.json({ message: 'Follow-up task removed.' });
});

// --- Billing / Checkout APIs ---

app.post('/api/crm/subscribe', checkAuth, (req, res) => {
  const { planId } = req.body;
  const plan = db.getPlanById(planId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  const user = req.user;
  user.planId = planId;
  user.planStatus = 'active';
  user.planStartDate = new Date().toISOString();
  db.saveUser(user);

  // Record income transactions (if pricing > 0)
  db.addTransaction(user.id, user.name, plan.name, plan.price, plan.billingCycle);

  // Log activity
  db.logActivity(user.id, user.name, 'Plan Purchase', `Upgraded to "${plan.name}" plan ($${plan.price}/${plan.billingCycle})`);

  const { password: _, ...userWithoutPassword } = user;
  res.json({ 
    message: `Successfully subscribed to ${plan.name}`,
    user: userWithoutPassword
  });
});

// --- Speech-to-Text Activity Log Endpoint ---
app.post('/api/crm/activity', checkAuth, (req, res) => {
  const { action, details } = req.body;
  if (!action || !details) {
    return res.status(400).json({ error: 'Action and details are required.' });
  }

  const activity = db.logActivity(req.user.id, req.user.name, action, details);
  res.status(201).json(activity);
});

// --- Admin Panel Plan CRUD APIs ---

app.post('/api/admin/plans', checkAdmin, (req, res) => {
  const { name, price, billingCycle, features, status } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Plan name and price are required.' });
  }

  const newPlan = db.savePlan({
    name,
    price: Number(price),
    billingCycle: billingCycle || 'monthly',
    features: Array.isArray(features) ? features : [],
    status: status || 'active'
  });

  db.logActivity(req.user.id, req.user.name, 'Admin: Plan Created', `Created a new SaaS plan: "${name}"`);
  res.status(201).json(newPlan);
});

app.put('/api/admin/plans/:id', checkAdmin, (req, res) => {
  const { id } = req.params;
  const existingPlan = db.getPlanById(id);
  if (!existingPlan) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  const updatedPlan = db.savePlan({
    ...existingPlan,
    ...req.body,
    id
  });

  db.logActivity(req.user.id, req.user.name, 'Admin: Plan Updated', `Modified plan: "${updatedPlan.name}"`);
  res.json(updatedPlan);
});

app.delete('/api/admin/plans/:id', checkAdmin, (req, res) => {
  const { id } = req.params;
  const existingPlan = db.getPlanById(id);
  if (!existingPlan) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  db.deletePlan(id);
  db.logActivity(req.user.id, req.user.name, 'Admin: Plan Deleted', `Removed plan: "${existingPlan.name}"`);
  res.json({ message: 'Plan deleted successfully.' });
});

// --- Admin Analytics & Logging APIs ---

app.get('/api/admin/users', checkAdmin, (req, res) => {
  const users = db.getUsers().filter(u => u.role !== 'admin');
  const leads = db.getLeads();
  const activities = db.getActivities();
  const plans = db.getPlans();

  const userStats = users.map(user => {
    const userLeads = leads.filter(l => l.userId === user.id);
    const userActivities = activities.filter(a => a.userId === user.id);
    const sttUsageCount = userActivities.filter(a => a.action === 'Speech-to-Text Lead Entry').length;
    const plan = plans.find(p => p.id === user.planId) || { name: 'Free Starter' };

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      planName: plan.name,
      leadsCount: userLeads.length,
      sttUsageCount: sttUsageCount,
      lastActive: userActivities[0] ? userActivities[0].timestamp : user.createdAt,
      createdAt: user.createdAt
    };
  });

  res.json(userStats);
});

app.get('/api/admin/activities', checkAdmin, (req, res) => {
  res.json(db.getActivities());
});

app.get('/api/admin/transactions', checkAdmin, (req, res) => {
  res.json(db.getTransactions());
});

app.get('/api/admin/stats', checkAdmin, (req, res) => {
  const users = db.getUsers().filter(u => u.role !== 'admin');
  const leads = db.getLeads();
  const transactions = db.getTransactions();
  const plans = db.getPlans();
  const activities = db.getActivities();

  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const activeUsersCount = users.length;
  
  // Calculate plans breakdown
  const planBreakdown = {};
  plans.forEach(p => { planBreakdown[p.name] = 0; });
  users.forEach(u => {
    const plan = plans.find(p => p.id === u.planId);
    if (plan) {
      planBreakdown[plan.name] = (planBreakdown[plan.name] || 0) + 1;
    }
  });

  // Calculate Speech-To-Text usage total
  const totalSttUsage = activities.filter(a => a.action === 'Speech-to-Text Lead Entry').length;

  // Monthly Revenue Chart Data (last 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue = {};
  
  // Initialize last 6 months with 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyRevenue[label] = 0;
  }

  transactions.forEach(t => {
    const tDate = new Date(t.timestamp);
    const label = `${monthNames[tDate.getMonth()]} ${tDate.getFullYear()}`;
    if (monthlyRevenue[label] !== undefined) {
      monthlyRevenue[label] += t.amount;
    }
  });

  // Format monthly revenue for chart
  const revenueChartData = Object.keys(monthlyRevenue).map(key => ({
    month: key,
    revenue: monthlyRevenue[key]
  }));

  res.json({
    totalRevenue,
    activeUsersCount,
    totalLeads: leads.length,
    totalSttUsage,
    planBreakdown,
    revenueChartData,
    recentActivities: activities.slice(0, 10)
  });
});

// Fallback: serve index.html for UI client routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` CRM SaaS App backend running on http://localhost:${PORT}`);
  console.log(` Default Admin Login: admin@crm.com / adminpassword`);
  console.log(` Default User Login:  demo@crm.com  / demopassword`);
  console.log(`=======================================================`);
});
