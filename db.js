const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure database directory and file exist
function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const defaultData = getSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
  } else {
    // Check if the file is valid JSON and not empty
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      JSON.parse(data);
    } catch (e) {
      console.error('Invalid DB file. Re-initializing with seed data...');
      const defaultData = getSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    }
  }
}

function getSeedData() {
  const defaultPlans = [
    {
      id: 'plan_free',
      name: 'Free Starter',
      price: 0,
      billingCycle: 'monthly',
      features: ['Up to 15 Leads', 'Basic CRM Pipeline', 'Manual Lead Entry'],
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'plan_pro',
      name: 'Growth Pro',
      price: 29,
      billingCycle: 'monthly',
      features: ['Unlimited Leads', 'Advanced Follow-up Manager', 'Speech-to-Text Lead Entry', 'Activity Reports'],
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'plan_ent',
      name: 'Enterprise Plus',
      price: 99,
      billingCycle: 'monthly',
      features: ['Everything in Pro', 'Dedicated Account Manager', 'Custom API Access', 'SLA Support'],
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];

  const defaultUsers = [
    {
      id: 'user_admin',
      email: 'admin@crm.com',
      password: 'adminpassword', // In production we would hash this, for demo/dev it's kept readable
      name: 'Sarah Jenkins (Admin)',
      role: 'admin',
      planId: 'plan_ent',
      planStatus: 'active',
      planStartDate: new Date().toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
    },
    {
      id: 'user_demo',
      email: 'demo@crm.com',
      password: 'demopassword',
      name: 'Shivam Rawat',
      role: 'user',
      planId: 'plan_pro',
      planStatus: 'active',
      planStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user_new',
      email: 'alex@example.com',
      password: 'password123',
      name: 'Alex Rivera',
      role: 'user',
      planId: 'plan_free',
      planStatus: 'active',
      planStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const defaultLeads = [
    {
      id: 'lead_1',
      userId: 'user_demo',
      name: 'John Doe',
      company: 'Stark Industries',
      email: 'john@stark.com',
      phone: '+1 (555) 123-4567',
      budget: 12000,
      status: 'Qualified',
      priority: 'High',
      notes: 'Interested in core licensing. Prefers communication via email. Had a great intro call.',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'lead_2',
      userId: 'user_demo',
      name: 'Jane Smith',
      company: 'Acme Corp',
      email: 'jane@acme.com',
      phone: '+1 (555) 987-6543',
      budget: 4500,
      status: 'Proposal',
      priority: 'Medium',
      notes: 'Sent pricing proposal for 5 user seats. Awaiting feedback by end of week.',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'lead_3',
      userId: 'user_demo',
      name: 'David Lee',
      company: 'Nova Technologies',
      email: 'david.l@novatech.io',
      phone: '+1 (555) 246-8102',
      budget: 8500,
      status: 'New',
      priority: 'Low',
      notes: 'Registered via web form. Needs follow up call to assess business requirements.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'lead_4',
      userId: 'user_demo',
      name: 'Elena Rostova',
      company: 'Siberia Software',
      email: 'elena@siberiasoft.ru',
      phone: '+7 (495) 111-2233',
      budget: 25000,
      status: 'Won',
      priority: 'High',
      notes: 'Deal closed successfully! Contract signed on 4th June. Handed over to onboarding team.',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'lead_5',
      userId: 'user_demo',
      name: 'Marcus Brody',
      company: 'Museum Artifacts Ltd',
      email: 'm.brody@museum.org',
      phone: '+44 20 7946 0958',
      budget: 1500,
      status: 'Contacted',
      priority: 'Low',
      notes: 'Left a voicemail. Will follow up in 3 days.',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const defaultFollowups = [
    {
      id: 'follow_1',
      userId: 'user_demo',
      leadId: 'lead_2',
      leadName: 'Jane Smith (Acme Corp)',
      title: 'Follow up on proposal feedback',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days in future
      time: '14:00',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'follow_2',
      userId: 'user_demo',
      leadId: 'lead_3',
      leadName: 'David Lee (Nova Technologies)',
      title: 'Introductory Discovery Call',
      date: new Date().toISOString().split('T')[0], // Today
      time: '11:30',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'follow_3',
      userId: 'user_demo',
      leadId: 'lead_5',
      leadName: 'Marcus Brody (Museum Artifacts Ltd)',
      title: 'Second follow-up email',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      time: '10:00',
      status: 'completed',
      createdAt: new Date().toISOString()
    }
  ];

  const defaultActivities = [
    {
      id: 'act_1',
      userId: 'user_demo',
      userName: 'Shivam Rawat',
      action: 'Login',
      details: 'User logged in to the platform',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 'act_2',
      userId: 'user_demo',
      userName: 'Shivam Rawat',
      action: 'Speech-to-Text Lead Entry',
      details: 'Created lead "David Lee" using voice transcription',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'act_3',
      userId: 'user_new',
      userName: 'Alex Rivera',
      action: 'Registration',
      details: 'Registered a new free account',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'act_4',
      userId: 'user_demo',
      userName: 'Shivam Rawat',
      action: 'Plan Purchase',
      details: 'Upgraded subscription to Growth Pro plan',
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'act_5',
      userId: 'user_demo',
      userName: 'Shivam Rawat',
      action: 'Lead Created',
      details: 'Added lead "Elena Rostova" manually',
      timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Seed transactions to create revenue data for charts (spanning the past 6 months)
  const defaultTransactions = [
    {
      id: 'tx_1',
      userId: 'user_demo',
      userName: 'Shivam Rawat',
      planName: 'Growth Pro',
      amount: 29,
      billingCycle: 'monthly',
      status: 'success',
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      invoiceNo: 'INV-2026-001'
    },
    {
      id: 'tx_2',
      userId: 'user_new',
      userName: 'Alex Rivera',
      planName: 'Free Starter',
      amount: 0,
      billingCycle: 'monthly',
      status: 'success',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      invoiceNo: 'INV-2026-002'
    },
    {
      id: 'tx_3',
      userId: 'user_user_99', // Simulating historic transactions
      userName: 'Alice Cooper',
      planName: 'Growth Pro',
      amount: 29,
      billingCycle: 'monthly',
      status: 'success',
      timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      invoiceNo: 'INV-2026-003'
    },
    {
      id: 'tx_4',
      userId: 'user_user_98',
      userName: 'Bob Vance',
      planName: 'Enterprise Plus',
      amount: 99,
      billingCycle: 'monthly',
      status: 'success',
      timestamp: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      invoiceNo: 'INV-2026-004'
    },
    {
      id: 'tx_5',
      userId: 'user_user_97',
      userName: 'Charlie Brown',
      planName: 'Growth Pro',
      amount: 29,
      billingCycle: 'monthly',
      status: 'success',
      timestamp: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(),
      invoiceNo: 'INV-2026-005'
    },
    {
      id: 'tx_6',
      userId: 'user_user_96',
      userName: 'Diana Prince',
      planName: 'Enterprise Plus',
      amount: 99,
      billingCycle: 'monthly',
      status: 'success',
      timestamp: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000).toISOString(),
      invoiceNo: 'INV-2026-006'
    }
  ];

  return {
    plans: defaultPlans,
    users: defaultUsers,
    leads: defaultLeads,
    followups: defaultFollowups,
    activities: defaultActivities,
    transactions: defaultTransactions
  };
}

// Thread-safe read/write functions
function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB file:', err);
    return getSeedData();
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing DB file:', err);
    return false;
  }
}

// Database Helper APIs
const db = {
  // Plan Operations
  getPlans: () => {
    return readDb().plans;
  },
  getPlanById: (id) => {
    return readDb().plans.find(p => p.id === id);
  },
  savePlan: (plan) => {
    const data = readDb();
    const index = data.plans.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      data.plans[index] = { ...data.plans[index], ...plan };
    } else {
      plan.id = plan.id || 'plan_' + Math.random().toString(36).substr(2, 9);
      plan.createdAt = new Date().toISOString();
      data.plans.push(plan);
    }
    writeDb(data);
    return plan;
  },
  deletePlan: (id) => {
    const data = readDb();
    const index = data.plans.findIndex(p => p.id === id);
    if (index >= 0) {
      data.plans.splice(index, 1);
      writeDb(data);
      return true;
    }
    return false;
  },

  // User Operations
  getUsers: () => {
    return readDb().users;
  },
  getUserById: (id) => {
    return readDb().users.find(u => u.id === id);
  },
  getUserByEmail: (email) => {
    return readDb().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  saveUser: (user) => {
    const data = readDb();
    const index = data.users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      data.users[index] = { ...data.users[index], ...user };
    } else {
      user.id = user.id || 'user_' + Math.random().toString(36).substr(2, 9);
      user.createdAt = user.createdAt || new Date().toISOString();
      user.role = user.role || 'user';
      user.planId = user.planId || 'plan_free';
      user.planStatus = user.planStatus || 'active';
      user.planStartDate = user.planStartDate || new Date().toISOString();
      data.users.push(user);
    }
    writeDb(data);
    return user;
  },

  // Lead Operations
  getLeads: () => {
    return readDb().leads;
  },
  getLeadsByUserId: (userId) => {
    return readDb().leads.filter(l => l.userId === userId);
  },
  getLeadById: (id) => {
    return readDb().leads.find(l => l.id === id);
  },
  saveLead: (lead) => {
    const data = readDb();
    const index = data.leads.findIndex(l => l.id === lead.id);
    const now = new Date().toISOString();
    if (index >= 0) {
      data.leads[index] = { ...data.leads[index], ...lead, updatedAt: now };
    } else {
      lead.id = 'lead_' + Math.random().toString(36).substr(2, 9);
      lead.createdAt = now;
      lead.updatedAt = now;
      data.leads.push(lead);
    }
    writeDb(data);
    return lead;
  },
  deleteLead: (id) => {
    const data = readDb();
    const index = data.leads.findIndex(l => l.id === id);
    if (index >= 0) {
      data.leads.splice(index, 1);
      writeDb(data);
      return true;
    }
    return false;
  },

  // Follow-up Operations
  getFollowups: () => {
    return readDb().followups;
  },
  getFollowupsByUserId: (userId) => {
    return readDb().followups.filter(f => f.userId === userId);
  },
  saveFollowup: (followup) => {
    const data = readDb();
    const index = data.followups.findIndex(f => f.id === followup.id);
    if (index >= 0) {
      data.followups[index] = { ...data.followups[index], ...followup };
    } else {
      followup.id = 'follow_' + Math.random().toString(36).substr(2, 9);
      followup.createdAt = new Date().toISOString();
      followup.status = followup.status || 'pending';
      data.followups.push(followup);
    }
    writeDb(data);
    return followup;
  },
  deleteFollowup: (id) => {
    const data = readDb();
    const index = data.followups.findIndex(f => f.id === id);
    if (index >= 0) {
      data.followups.splice(index, 1);
      writeDb(data);
      return true;
    }
    return false;
  },

  // Activity Log Operations
  getActivities: () => {
    return readDb().activities;
  },
  logActivity: (userId, userName, action, details) => {
    const data = readDb();
    const activity = {
      id: 'act_' + Math.random().toString(36).substr(2, 9),
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    data.activities.unshift(activity); // Add to beginning
    // Keep logs manageable (max 200 items)
    if (data.activities.length > 200) {
      data.activities = data.activities.slice(0, 200);
    }
    writeDb(data);
    return activity;
  },

  // Transactions Operations
  getTransactions: () => {
    return readDb().transactions;
  },
  addTransaction: (userId, userName, planName, amount, billingCycle) => {
    const data = readDb();
    const tx = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      userId,
      userName,
      planName,
      amount,
      billingCycle,
      status: 'success',
      timestamp: new Date().toISOString(),
      invoiceNo: `INV-2026-${String(data.transactions.length + 1).padStart(3, '0')}`
    };
    data.transactions.unshift(tx);
    writeDb(data);
    return tx;
  }
};

module.exports = db;
