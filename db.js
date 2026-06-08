require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shivam-crm';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Schemas
const SettingSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed
});

const PlanSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  price: Number,
  billingCycle: String,
  features: [String],
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  email: { type: String, unique: true },
  password: { type: String },
  name: String,
  role: { type: String, default: 'user' },
  planId: String,
  planStatus: String,
  planStartDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const LeadSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  name: String,
  company: String,
  email: String,
  phone: String,
  budget: Number,
  status: String,
  priority: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const FollowupSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  leadId: String,
  leadName: String,
  title: String,
  date: String,
  time: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const ActivitySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  userName: String,
  action: String,
  details: String,
  timestamp: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  userName: String,
  planName: String,
  amount: Number,
  billingCycle: String,
  status: String,
  timestamp: { type: Date, default: Date.now },
  invoiceNo: String
});

// Models
const Setting = mongoose.model('Setting', SettingSchema);
const Plan = mongoose.model('Plan', PlanSchema);
const User = mongoose.model('User', UserSchema);
const Lead = mongoose.model('Lead', LeadSchema);
const Followup = mongoose.model('Followup', FollowupSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// Seeding function if DB is empty
async function initDb() {
  const planCount = await Plan.countDocuments();
  if (planCount === 0) {
    console.log('Seeding initial data to MongoDB...');
    const defaultPlans = [
      {
        id: 'plan_free', name: 'Free Starter', price: 0, billingCycle: 'monthly',
        features: ['Up to 15 Leads', 'Basic CRM Pipeline', 'Manual Lead Entry'], status: 'active'
      },
      {
        id: 'plan_pro', name: 'Growth Pro', price: 29, billingCycle: 'monthly',
        features: ['Unlimited Leads', 'Advanced Follow-up Manager', 'Speech-to-Text Lead Entry', 'Activity Reports'], status: 'active'
      },
      {
        id: 'plan_ent', name: 'Enterprise Plus', price: 99, billingCycle: 'monthly',
        features: ['Everything in Pro', 'Dedicated Account Manager', 'Custom API Access', 'SLA Support'], status: 'active'
      }
    ];
    await Plan.insertMany(defaultPlans);

    const defaultUsers = [
      {
        id: 'user_admin', email: 'admin@crm.com', password: 'adminpassword', name: 'Sarah Jenkins (Admin)',
        role: 'admin', planId: 'plan_ent', planStatus: 'active'
      },
      {
        id: 'user_demo', email: 'demo@crm.com', password: 'demopassword', name: 'Shivam Rawat',
        role: 'user', planId: 'plan_pro', planStatus: 'active'
      }
    ];
    await User.insertMany(defaultUsers);

    console.log('Seeding complete.');
  }
}
initDb();

const db = {
  // Settings
  getSetting: async (key) => {
    const s = await Setting.findOne({ key }).lean();
    return s ? s.value : null;
  },
  saveSetting: async (key, value) => {
    return await Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true }).lean();
  },

  // Plans
  getPlans: async () => await Plan.find().lean(),
  getPlanById: async (id) => await Plan.findOne({ id }).lean(),
  savePlan: async (planData) => {
    if (!planData.id) planData.id = 'plan_' + Math.random().toString(36).substr(2, 9);
    return await Plan.findOneAndUpdate({ id: planData.id }, planData, { upsert: true, new: true }).lean();
  },
  deletePlan: async (id) => await Plan.deleteOne({ id }),

  // Users
  getUsers: async () => await User.find().lean(),
  getUserById: async (id) => await User.findOne({ id }).lean(),
  getUserByEmail: async (email) => await User.findOne({ email: new RegExp('^' + email + '$', 'i') }).lean(),
  saveUser: async (userData) => {
    if (!userData.id) userData.id = 'user_' + Math.random().toString(36).substr(2, 9);
    return await User.findOneAndUpdate({ id: userData.id }, userData, { upsert: true, new: true }).lean();
  },

  // Leads
  getLeads: async () => await Lead.find().lean(),
  getLeadsByUserId: async (userId) => await Lead.find({ userId }).lean(),
  getLeadById: async (id) => await Lead.findOne({ id }).lean(),
  saveLead: async (leadData) => {
    if (!leadData.id) leadData.id = 'lead_' + Math.random().toString(36).substr(2, 9);
    leadData.updatedAt = new Date();
    return await Lead.findOneAndUpdate({ id: leadData.id }, leadData, { upsert: true, new: true }).lean();
  },
  deleteLead: async (id) => await Lead.deleteOne({ id }),

  // Followups
  getFollowups: async () => await Followup.find().lean(),
  getFollowupsByUserId: async (userId) => await Followup.find({ userId }).lean(),
  saveFollowup: async (data) => {
    if (!data.id) data.id = 'follow_' + Math.random().toString(36).substr(2, 9);
    return await Followup.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true }).lean();
  },
  deleteFollowup: async (id) => await Followup.deleteOne({ id }),

  // Activities
  getActivities: async () => await Activity.find().sort({ timestamp: -1 }).limit(200).lean(),
  logActivity: async (userId, userName, action, details) => {
    const act = new Activity({
      id: 'act_' + Math.random().toString(36).substr(2, 9),
      userId, userName, action, details
    });
    return await act.save();
  },

  // Transactions
  getTransactions: async () => await Transaction.find().sort({ timestamp: -1 }).lean(),
  addTransaction: async (userId, userName, planName, amount, billingCycle) => {
    const count = await Transaction.countDocuments();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const tx = new Transaction({
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      userId, userName, planName, amount, billingCycle, status: 'success', invoiceNo
    });
    return await tx.save();
  }
};

module.exports = db;
