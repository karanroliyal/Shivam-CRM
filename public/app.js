// Application Global State
const state = {
  currentUser: null,
  leads: [],
  followups: [],
  plans: [],
  adminStats: null,
  adminUsers: [],
  adminActivities: [],
  adminTransactions: [],
  leadViewMode: 'kanban', // 'kanban' or 'list'
  selectedLeadId: null,
  selectedPlanId: null,
  sttRecording: false,
  recognition: null,
  charts: {
    revenue: null,
    plans: null
  }
};

// API Base Url (assumed relative)
const API_BASE = '';

// Helper to make API requests with x-user-id auth headers
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.currentUser && state.currentUser.id) {
    headers['x-user-id'] = state.currentUser.id;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred during api fetch');
  }
  return data;
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'warning') icon = 'alert-triangle';
  if (type === 'danger') icon = 'alert-octagon';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // Remove toast after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ================= ROUTING & VIEW SWITCHING =================

// Show top-level sections (Landing, Auth, App)
function showView(viewId) {
  // Hide all main views
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.getElementById('app-layout').style.display = 'none';

  if (viewId.startsWith('auth-')) {
    document.getElementById('view-auth').classList.add('active');
    const isRegister = viewId === 'auth-register';
    toggleAuthMode(isRegister);
  } else if (viewId === 'app') {
    document.getElementById('app-layout').style.display = 'grid';
    // Decide default tab based on role
    if (state.currentUser.role === 'admin') {
      switchTab('admin-dashboard');
    } else {
      switchTab('user-dashboard');
    }
  } else {
    // Landing view
    document.getElementById('view-landing').classList.add('active');
    loadLandingPricingPlans();
  }
}

// Switch tabs inside the App layout
async function switchTab(tabId) {
  // Hide all tab panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  // Remove active class from all nav items
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  // Show selected panel
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add('active');

  // Find sidebar link and set active
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(tabId)) {
      item.classList.add('active');
    }
  });

  // Load appropriate data based on tab
  try {
    if (tabId === 'user-dashboard') {
      await loadUserDashboardData();
    } else if (tabId === 'user-pipeline') {
      await loadUserLeads();
    } else if (tabId === 'user-followups') {
      await loadUserFollowups();
    } else if (tabId === 'user-billing') {
      await loadBillingTabPlans();
    } else if (tabId === 'admin-dashboard') {
      await loadAdminDashboardStats();
    } else if (tabId === 'admin-plans') {
      await loadAdminPlans();
    } else if (tabId === 'admin-users') {
      await loadAdminUsers();
    } else if (tabId === 'admin-transactions') {
      await loadAdminTransactions();
    } else if (tabId === 'admin-settings') {
      await loadAdminSettings();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Smooth scroll on landing page
function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

// ================= AUTHENTICATION HANDLERS =================

let isRegisterMode = false;

function toggleAuthMode(register) {
  isRegisterMode = register;
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const nameGroup = document.getElementById('form-group-name');
  const nameInput = document.getElementById('auth-name');
  const btn = document.getElementById('auth-btn');
  const toggleText = document.getElementById('auth-toggle-text');

  if (register) {
    title.innerText = 'Create Account';
    subtitle.innerText = 'Start your 14-day free trial. No credit card required.';
    nameGroup.style.display = 'block';
    nameInput.required = true;
    btn.innerText = 'Start CRM Free Trial';
    toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode(false)">Sign In</a>';
  } else {
    title.innerText = 'Welcome Back';
    subtitle.innerText = 'Sign in to access your CRM workspace';
    nameGroup.style.display = 'none';
    nameInput.required = false;
    btn.innerText = 'Sign In';
    toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode(true)">Create one</a>';
  }
  document.getElementById('auth-form').reset();
}

function fillDemoCredentials(email, password) {
  document.getElementById('auth-email').value = email;
  document.getElementById('auth-password').value = password;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('auth-name').value;
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    let responseData;
    if (isRegisterMode) {
      responseData = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      showToast('Account registered successfully!', 'success');
    } else {
      responseData = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      showToast('Logged in successfully', 'success');
    }

    state.currentUser = responseData.user;
    localStorage.setItem('apex_crm_user', JSON.stringify(state.currentUser));
    
    updateUserProfileUI();
    showView('app');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem('apex_crm_user');
  showToast('Logged out successfully');
  showView('landing');
}

function updateUserProfileUI() {
  if (!state.currentUser) return;

  const initials = state.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById('profile-initials').innerText = initials;
  document.getElementById('profile-name').innerText = state.currentUser.name;
  
  // Set UI elements based on Role
  const isUser = state.currentUser.role === 'user';
  const isAdmin = state.currentUser.role === 'admin';

  document.getElementById('nav-user').style.display = isUser ? 'flex' : 'none';
  document.getElementById('nav-admin').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('sidebar-role-badge').innerText = state.currentUser.role;
  document.getElementById('sidebar-role-badge').className = `user-role-badge ${isAdmin ? 'badge-indigo' : ''}`;
  
  document.getElementById('header-add-lead-btn').style.display = isUser ? 'inline-flex' : 'none';
  document.getElementById('header-admin-indicator').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('global-search').style.display = isUser ? 'block' : 'none';

  // Load current plan details if it's a regular user
  if (isUser) {
    loadBillingInfo();
  } else {
    document.getElementById('profile-plan').innerText = 'System Root Admin';
  }
}

async function loadBillingInfo() {
  try {
    const plans = await apiFetch('/api/plans');
    const userPlan = plans.find(p => p.id === state.currentUser.planId);
    if (userPlan) {
      document.getElementById('profile-plan').innerText = userPlan.name;
    }
  } catch (e) {
    console.error(e);
  }
}

// ================= CRM LEADS PIPELINE MANAGER =================

async function loadUserLeads() {
  try {
    state.leads = await apiFetch('/api/crm/leads');
    renderPipelineLeads();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderPipelineLeads(query = '') {
  if (state.leadViewMode === 'kanban') {
    renderKanbanBoard(query);
  } else {
    renderListView(query);
  }
}

function renderKanbanBoard(query = '') {
  const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
  
  // Clear lists & counts
  stages.forEach(stage => {
    const el = document.getElementById(`cards-${stage}`);
    if (el) el.innerHTML = '';
    const ct = document.getElementById(`count-${stage}`);
    if (ct) ct.innerText = '0';
  });

  let filteredLeads = state.leads;
  if (query) {
    const q = query.toLowerCase();
    filteredLeads = state.leads.filter(l => 
      l.name.toLowerCase().includes(q) || 
      (l.company && l.company.toLowerCase().includes(q)) || 
      (l.email && l.email.toLowerCase().includes(q)) || 
      (l.phone && l.phone.toLowerCase().includes(q))
    );
  }

  const stageCounts = { New: 0, Contacted: 0, Qualified: 0, Proposal: 0, Won: 0, Lost: 0 };

  filteredLeads.forEach(lead => {
    const container = document.getElementById(`cards-${lead.status}`);
    if (!container) return;

    stageCounts[lead.status]++;

    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.setAttribute('ondragstart', `handleLeadDragStart(event, "${lead.id}")`);
    card.onclick = () => openLeadModal(lead.id);

    card.innerHTML = `
      <h5 class="kanban-card-title">${escapeHtml(lead.name)}</h5>
      <p class="kanban-card-company">${escapeHtml(lead.company || 'No Company')}</p>
      <div class="kanban-card-footer">
        <span class="kanban-card-budget">${lead.budget > 0 ? '$' + Number(lead.budget).toLocaleString() : '$0'}</span>
        <span class="priority-indicator ${lead.priority}">${lead.priority}</span>
      </div>
    `;

    container.appendChild(card);
  });

  stages.forEach(stage => {
    const ct = document.getElementById(`count-${stage}`);
    if (ct) ct.innerText = stageCounts[stage];
  });
}

function toggleLeadViewMode(mode) {
  state.leadViewMode = mode;
  document.getElementById('btn-view-kanban').classList.toggle('active', mode === 'kanban');
  document.getElementById('btn-view-list').classList.toggle('active', mode === 'list');
  
  document.getElementById('leads-kanban-view').style.display = mode === 'kanban' ? 'grid' : 'none';
  document.getElementById('leads-list-view').style.display = mode === 'list' ? 'block' : 'none';

  renderPipelineLeads(document.getElementById('global-search').value);
}

function renderListView(query = '') {
  const tbody = document.getElementById('leads-list-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let filteredLeads = state.leads;
  if (query) {
    const q = query.toLowerCase();
    filteredLeads = state.leads.filter(l => 
      l.name.toLowerCase().includes(q) || 
      (l.company && l.company.toLowerCase().includes(q)) || 
      (l.email && l.email.toLowerCase().includes(q)) || 
      (l.phone && l.phone.toLowerCase().includes(q))
    );
  }

  if (filteredLeads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No leads found.</td></tr>`;
    return;
  }

  filteredLeads.forEach(lead => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(lead.name)}</strong></td>
      <td>${escapeHtml(lead.company || '-')}</td>
      <td>
        <div style="font-size: 0.85rem">${escapeHtml(lead.email || '-')}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted)">${escapeHtml(lead.phone || '-')}</div>
      </td>
      <td><strong>${lead.budget > 0 ? '$' + Number(lead.budget).toLocaleString() : '$0'}</strong></td>
      <td><span class="priority-indicator ${lead.priority}">${lead.priority}</span></td>
      <td><span class="status-badge ${getLeadStatusBadgeClass(lead.status)}">${lead.status}</span></td>
      <td>
        <div class="actions-cell">
          <button onclick="openLeadModal('${lead.id}')" title="Edit Lead"><i data-lucide="edit-3"></i></button>
          <button class="btn-delete-row" onclick="deleteLead('${lead.id}')" title="Delete Lead"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

function getLeadStatusBadgeClass(status) {
  if (status === 'New') return 'info';
  if (status === 'Contacted') return 'warning';
  if (status === 'Qualified') return 'indigo';
  if (status === 'Proposal') return 'warning';
  if (status === 'Won') return 'success';
  return 'danger';
}

// Drag and drop mechanics
function handleLeadDragStart(e, leadId) {
  e.dataTransfer.setData('text/plain', leadId);
}

function allowLeadDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

document.querySelectorAll('.kanban-column').forEach(col => {
  col.addEventListener('dragleave', (e) => {
    e.currentTarget.classList.remove('dragover');
  });
});

async function handleLeadDrop(e, targetStage) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const leadId = e.dataTransfer.getData('text/plain');
  
  const lead = state.leads.find(l => l.id === leadId);
  if (!lead || lead.status === targetStage) return;

  try {
    const updatedLead = await apiFetch(`/api/crm/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: targetStage })
    });
    
    // Update local state
    const index = state.leads.findIndex(l => l.id === leadId);
    if (index >= 0) {
      state.leads[index] = updatedLead;
    }
    
    renderPipelineLeads();
    showToast(`Lead moved to ${targetStage}`, 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Lead search filter
function handleGlobalSearch(query) {
  if (!query) {
    renderPipelineLeads();
    return;
  }
  query = query.toLowerCase();
  
  // Filter local leads array
  const filtered = state.leads.filter(l => 
    l.name.toLowerCase().includes(query) || 
    (l.company && l.company.toLowerCase().includes(query)) ||
    (l.email && l.email.toLowerCase().includes(query))
  );

  // Re-render only
  if (state.leadViewMode === 'kanban') {
    const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
    stages.forEach(stage => {
      document.getElementById(`cards-${stage}`).innerHTML = '';
      document.getElementById(`count-${stage}`).innerText = '0';
    });
    const stageCounts = { New: 0, Contacted: 0, Qualified: 0, Proposal: 0, Won: 0, Lost: 0 };
    filtered.forEach(lead => {
      const container = document.getElementById(`cards-${lead.status}`);
      if (!container) return;
      stageCounts[lead.status]++;
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.draggable = true;
      card.setAttribute('ondragstart', `handleLeadDragStart(event, "${lead.id}")`);
      card.onclick = () => openLeadModal(lead.id);
      card.innerHTML = `
        <h5 class="kanban-card-title">${escapeHtml(lead.name)}</h5>
        <p class="kanban-card-company">${escapeHtml(lead.company || 'No Company')}</p>
        <div class="kanban-card-footer">
          <span class="kanban-card-budget">${lead.budget > 0 ? '$' + Number(lead.budget).toLocaleString() : '$0'}</span>
          <span class="priority-indicator ${lead.priority}">${lead.priority}</span>
        </div>
      `;
      container.appendChild(card);
    });
    stages.forEach(stage => {
      document.getElementById(`count-${stage}`).innerText = stageCounts[stage];
    });
  } else {
    // List view search
    const tbody = document.getElementById('leads-list-tbody');
    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No matching results found.</td></tr>`;
      return;
    }
    filtered.forEach(lead => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(lead.name)}</strong></td>
        <td>${escapeHtml(lead.company || '-')}</td>
        <td>
          <div style="font-size: 0.85rem">${escapeHtml(lead.email || '-')}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted)">${escapeHtml(lead.phone || '-')}</div>
        </td>
        <td><strong>${lead.budget > 0 ? '$' + Number(lead.budget).toLocaleString() : '$0'}</strong></td>
        <td><span class="priority-indicator ${lead.priority}">${lead.priority}</span></td>
        <td><span class="status-badge ${getLeadStatusBadgeClass(lead.status)}">${lead.status}</span></td>
        <td>
          <div class="actions-cell">
            <button onclick="openLeadModal('${lead.id}')" title="Edit Lead"><i data-lucide="edit-3"></i></button>
            <button class="btn-delete-row" onclick="deleteLead('${lead.id}')" title="Delete Lead"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  }
}

// Modal management
function openLeadModal(leadId = null) {
  state.selectedLeadId = leadId;
  const modal = document.getElementById('modal-lead');
  const title = document.getElementById('modal-lead-title');
  const form = document.getElementById('lead-form');

  if (leadId) {
    title.innerText = 'Edit Lead Details';
    const lead = state.leads.find(l => l.id === leadId);
    if (lead) {
      document.getElementById('lead-form-id').value = lead.id;
      document.getElementById('lead-name').value = lead.name;
      document.getElementById('lead-company').value = lead.company || '';
      document.getElementById('lead-email').value = lead.email || '';
      document.getElementById('lead-phone').value = lead.phone || '';
      document.getElementById('lead-budget').value = lead.budget || 0;
      document.getElementById('lead-priority').value = lead.priority || 'Medium';
      document.getElementById('lead-status').value = lead.status || 'New';
      document.getElementById('lead-notes').value = lead.notes || '';
    }
  } else {
    title.innerText = 'Add New Prospect';
    form.reset();
    document.getElementById('lead-form-id').value = '';
  }

  modal.classList.add('active');
  lucide.createIcons();
}

function closeLeadModal() {
  document.getElementById('modal-lead').classList.remove('active');
}

async function handleLeadSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('lead-form-id').value;
  const payload = {
    name: document.getElementById('lead-name').value,
    company: document.getElementById('lead-company').value,
    email: document.getElementById('lead-email').value,
    phone: document.getElementById('lead-phone').value,
    budget: Number(document.getElementById('lead-budget').value) || 0,
    priority: document.getElementById('lead-priority').value,
    status: document.getElementById('lead-status').value,
    notes: document.getElementById('lead-notes').value
  };

  try {
    if (id) {
      // Update
      const updated = await apiFetch(`/api/crm/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const index = state.leads.findIndex(l => l.id === id);
      if (index >= 0) state.leads[index] = updated;
      showToast('Lead updated successfully', 'success');
    } else {
      // Create
      const created = await apiFetch('/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.leads.push(created);
      showToast('Lead added successfully', 'success');
    }

    closeLeadModal();
    renderPipelineLeads();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deleteLead(id) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  try {
    await apiFetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
    state.leads = state.leads.filter(l => l.id !== id);
    renderPipelineLeads();
    showToast('Lead deleted successfully');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ================= SPEECH DICTATION (DIRECT ENTRY) =================

function dictateInto(fieldId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    showToast('Speech API is not supported by your browser.', 'danger');
    return;
  }

  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = 'en-US';

  const btn = document.querySelector(`button[onclick="dictateInto('${fieldId}')"]`);

  rec.onstart = () => {
    showToast('Listening... Speak now.', 'info');
    if (btn) {
      btn.classList.add('btn-emerald');
      btn.classList.remove('btn-outline');
      const icon = btn.querySelector('svg') || btn.querySelector('i');
      if (icon) icon.classList.add('animate-pulse');
    }
  };

    rec.onerror = (event) => {
      let errMsg = event.error;
      if (event.error === 'network') {
        errMsg = 'Network failed. Some browsers (like Brave) or firewalls block speech services.';
      } else if (event.error === 'not-allowed') {
        errMsg = 'Microphone access was denied. Please allow microphone permissions.';
      }
      showToast(`Speech error: ${errMsg}`, 'danger');
      
      if (btn) {
        btn.classList.remove('btn-emerald');
        btn.classList.add('btn-outline');
        const icon = btn.querySelector('svg') || btn.querySelector('i');
        if (icon) icon.classList.remove('animate-pulse');
      }
    };

  rec.onend = () => {
    if (btn) {
      btn.classList.remove('btn-emerald');
      btn.classList.add('btn-outline');
      const icon = btn.querySelector('svg') || btn.querySelector('i');
      if (icon) icon.classList.remove('animate-pulse');
    }
  };

  rec.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }

    const input = document.getElementById(fieldId);
    if (input) {
      if (input.value) {
        input.value += ' ' + transcript.trim();
      } else {
        input.value = transcript.trim();
      }
      showToast('Speech captured!', 'success');
      
      // Log voice activity
      logUserAction('Speech-to-Text Entry', `Used voice dictation for field: ${fieldId}`);
    }
  };

  try {
    rec.start();
  } catch (e) {
    console.error(e);
  }
}

// Log STT/Activity custom calls on server
async function logUserAction(action, details) {
  try {
    await apiFetch('/api/crm/activity', {
      method: 'POST',
      body: JSON.stringify({ action, details })
    });
  } catch (err) {
    console.error('Failed to log activity on server:', err);
  }
}

// ================= FOLLOW-UPS & TASKS MANAGER =================

async function loadUserFollowups() {
  try {
    state.followups = await apiFetch('/api/crm/followups');
    renderFollowupLists();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderFollowupLists() {
  const pendingContainer = document.getElementById('followups-pending-list');
  const completedContainer = document.getElementById('followups-completed-list');

  pendingContainer.innerHTML = '';
  completedContainer.innerHTML = '';

  const pending = state.followups.filter(f => f.status === 'pending');
  const completed = state.followups.filter(f => f.status === 'completed');

  // Update navbar/dashboard counters
  const navbarBadge = document.getElementById('badge-followup-count');
  if (pending.length > 0) {
    navbarBadge.innerText = pending.length;
    navbarBadge.style.display = 'inline-block';
  } else {
    navbarBadge.style.display = 'none';
  }

  // Render Pending
  if (pending.length === 0) {
    pendingContainer.innerHTML = `<p class="text-muted text-center py-4">No pending followups. Schedule one now!</p>`;
  } else {
    pending.forEach(task => {
      const el = document.createElement('div');
      el.className = 'task-item';
      el.innerHTML = `
        <div class="task-checkbox" onclick="toggleTaskStatus('${task.id}', 'completed')" title="Mark as completed">
          <i data-lucide="check"></i>
        </div>
        <div class="task-content">
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          <div class="task-meta">
            <span><i data-lucide="user" style="width:0.85rem"></i> ${escapeHtml(task.leadName)}</span>
            <span><i data-lucide="calendar" style="width:0.85rem"></i> ${task.date} (${task.time})</span>
          </div>
        </div>
        <button class="task-delete-btn" onclick="deleteFollowup('${task.id}')" title="Delete Task"><i data-lucide="trash-2"></i></button>
      `;
      pendingContainer.appendChild(el);
    });
  }

  // Render Completed
  if (completed.length === 0) {
    completedContainer.innerHTML = `<p class="text-muted text-center py-4">Completed tasks will show here.</p>`;
  } else {
    completed.forEach(task => {
      const el = document.createElement('div');
      el.className = 'task-item completed';
      el.innerHTML = `
        <div class="task-checkbox" onclick="toggleTaskStatus('${task.id}', 'pending')" title="Re-open task">
          <i data-lucide="check"></i>
        </div>
        <div class="task-content">
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          <div class="task-meta">
            <span><i data-lucide="user" style="width:0.85rem"></i> ${escapeHtml(task.leadName)}</span>
            <span><i data-lucide="calendar" style="width:0.85rem"></i> ${task.date}</span>
          </div>
        </div>
        <button class="task-delete-btn" onclick="deleteFollowup('${task.id}')" title="Delete Task"><i data-lucide="trash-2"></i></button>
      `;
      completedContainer.appendChild(el);
    });
  }

  lucide.createIcons();
}

async function toggleTaskStatus(id, newStatus) {
  try {
    const updated = await apiFetch(`/api/crm/followups/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    
    // Update local state
    const index = state.followups.findIndex(f => f.id === id);
    if (index >= 0) {
      state.followups[index] = updated;
    }
    
    renderFollowupLists();
    showToast(newStatus === 'completed' ? 'Task marked complete' : 'Task re-opened', 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deleteFollowup(id) {
  try {
    await apiFetch(`/api/crm/followups/${id}`, { method: 'DELETE' });
    state.followups = state.followups.filter(f => f.id !== id);
    renderFollowupLists();
    showToast('Follow-up task removed');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Modal schedule
async function openFollowupModal() {
  // Populate lead options
  const select = document.getElementById('followup-lead');
  select.innerHTML = '<option value="">-- General / No Lead Link --</option>';
  
  try {
    state.leads = await apiFetch('/api/crm/leads');
    state.leads.forEach(lead => {
      const opt = document.createElement('option');
      opt.value = lead.id;
      opt.setAttribute('data-name', `${lead.name} (${lead.company || 'Individual'})`);
      opt.innerText = `${lead.name} - ${lead.company || 'Individual'}`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }

  // Set default date to today
  document.getElementById('followup-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('followup-form').reset();
  
  document.getElementById('modal-followup').classList.add('active');
}

function closeFollowupModal() {
  document.getElementById('modal-followup').classList.remove('active');
}

async function handleFollowupSubmit(e) {
  e.preventDefault();
  const select = document.getElementById('followup-lead');
  const leadId = select.value;
  const leadName = leadId ? select.options[select.selectedIndex].getAttribute('data-name') : 'General Followup';

  const payload = {
    leadId,
    leadName,
    title: document.getElementById('followup-title').value,
    date: document.getElementById('followup-date').value,
    time: document.getElementById('followup-time').value
  };

  try {
    const created = await apiFetch('/api/crm/followups', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    state.followups.push(created);
    closeFollowupModal();
    renderFollowupLists();
    showToast('Follow-up scheduled successfully', 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ================= USER DASHBOARD OVERVIEW =================

async function loadUserDashboardData() {
  try {
    const leads = await apiFetch('/api/crm/leads');
    const followups = await apiFetch('/api/crm/followups');
    const plans = await apiFetch('/api/plans');
    
    state.leads = leads;
    state.followups = followups;

    // Render Quota Progress
    const userPlan = plans.find(p => p.id === state.currentUser.planId) || { name: 'Free Starter' };
    const maxLeads = state.currentUser.planId === 'plan_free' ? 15 : 'Unlimited';
    
    document.getElementById('dashboard-user-name').innerText = state.currentUser.name;
    document.getElementById('lead-quota-used').innerText = leads.length;
    document.getElementById('lead-quota-total').innerText = maxLeads;

    const progressFill = document.getElementById('lead-quota-progress');
    if (maxLeads === 'Unlimited') {
      progressFill.style.width = '100%';
      progressFill.style.backgroundColor = 'var(--color-success)';
      document.getElementById('dashboard-quota-container').style.display = 'block';
    } else {
      const pct = Math.min((leads.length / 15) * 100, 100);
      progressFill.style.width = `${pct}%`;
      progressFill.style.backgroundColor = pct >= 80 ? 'var(--color-danger)' : 'var(--color-primary)';
      document.getElementById('dashboard-quota-container').style.display = 'block';
    }

    // Math metrics
    const hotLeadsCount = leads.filter(l => l.priority === 'High' && l.status !== 'Won' && l.status !== 'Lost').length;
    const pendingFollowups = followups.filter(f => f.status === 'pending').length;
    const totalPipelineVal = leads
      .filter(l => l.status !== 'Lost')
      .reduce((acc, curr) => acc + (Number(curr.budget) || 0), 0);

    document.getElementById('user-stat-total-leads').innerText = leads.length;
    document.getElementById('user-stat-hot-leads').innerText = hotLeadsCount;
    document.getElementById('user-stat-pending-followups').innerText = pendingFollowups;
    document.getElementById('user-stat-pipeline-value').innerText = '₹' + totalPipelineVal.toLocaleString();

    // Render Followups scheduled for today
    renderDashboardFollowups(followups);

    // Render Pipeline stages breakdown list
    renderDashboardPipelineSummary(leads);

    // Ensure icons are created for the dashboard
    lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderDashboardFollowups(followups) {
  const container = document.getElementById('dashboard-followups-list');
  container.innerHTML = '';

  const today = new Date().toISOString().split('T')[0];
  const todaysFollowups = followups.filter(f => f.date === today && f.status === 'pending');

  if (todaysFollowups.length === 0) {
    container.innerHTML = `<p class="text-muted text-center py-4">No tasks scheduled for today.</p>`;
    lucide.createIcons();
    return;
  }

  todaysFollowups.forEach(item => {
    const el = document.createElement('div');
    el.className = 'followup-card-item';
    el.innerHTML = `
      <div class="followup-card-info">
        <h4>${escapeHtml(item.title)}</h4>
        <p><i data-lucide="user" style="width:0.75rem;height:0.75rem;display:inline"></i> ${escapeHtml(item.leadName)} &bull; ${item.time}</p>
      </div>
      <button class="btn btn-xs btn-emerald" onclick="toggleTaskStatus('${item.id}', 'completed')">Complete</button>
    `;
    container.appendChild(el);
  });
  lucide.createIcons();
}

function renderDashboardPipelineSummary(leads) {
  const container = document.getElementById('dashboard-pipeline-summary');
  container.innerHTML = '';

  const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
  const stageCounts = { New: 0, Contacted: 0, Qualified: 0, Proposal: 0, Won: 0, Lost: 0 };
  const total = leads.length || 1; // avoid division by zero

  leads.forEach(l => {
    stageCounts[l.status] = (stageCounts[l.status] || 0) + 1;
  });

  stages.forEach(stage => {
    const count = stageCounts[stage];
    const pct = (count / total) * 100;
    
    let color = 'bg-info';
    if (stage === 'Contacted') color = 'bg-warning';
    if (stage === 'Qualified') color = 'bg-indigo';
    if (stage === 'Proposal') color = 'bg-purple';
    if (stage === 'Won') color = 'bg-success';
    if (stage === 'Lost') color = 'bg-danger';

    const el = document.createElement('div');
    el.className = 'pipeline-summary-item';
    el.innerHTML = `
      <div class="pipeline-summary-info">
        <span class="pipeline-summary-name">${stage}</span>
        <span><strong>${count}</strong> (${Math.round(pct)}%)</span>
      </div>
      <div class="bar-bg"><div class="bar-fill ${color}" style="width: ${pct}%"></div></div>
    `;
    container.appendChild(el);
  });
}

// ================= USER BILLING & SUBSCRIPTIONS =================

async function loadBillingTabPlans() {
  try {
    const plans = await apiFetch('/api/plans');
    const user = state.currentUser;

    // Set current plan card info
    const activePlan = plans.find(p => p.id === user.planId) || { name: 'Free Starter', price: 0, billingCycle: 'monthly' };
    
    document.getElementById('billing-current-plan-name').innerText = activePlan.name;
    document.getElementById('billing-current-plan-price').innerText = `₹${activePlan.price}`;
    document.getElementById('billing-current-plan-date').innerText = new Date(user.planStartDate).toLocaleDateString();

    // Render upgrade offers (hide currently owned plan)
    const container = document.getElementById('billing-pricing-cards');
    container.innerHTML = '';

    const upgradePlans = plans.filter(p => p.id !== user.planId);
    if (upgradePlans.length === 0) {
      container.innerHTML = `<p class="text-muted text-center py-4">You are currently subscribed to the highest tier plan!</p>`;
      return;
    }

    upgradePlans.forEach(plan => {
      const card = document.createElement('div');
      card.className = `pricing-card ${plan.id === 'plan_pro' ? 'popular' : ''}`;
      
      let listFeatures = plan.features.map(f => `<li><i data-lucide="check"></i> ${escapeHtml(f)}</li>`).join('');

      card.innerHTML = `
        ${plan.id === 'plan_pro' ? '<span class="popular-badge">Recommended</span>' : ''}
        <h3>${escapeHtml(plan.name)}</h3>
        <p class="text-muted">Best for growing teams</p>
        <div class="pricing-price">₹${plan.price}<span>/${plan.billingCycle === 'monthly' ? 'mo' : 'yr'}</span></div>
        <button class="btn btn-primary btn-block btn-lg" onclick="openCheckoutModal('${plan.id}')">Upgrade Plan</button>
        <ul class="pricing-features">${listFeatures}</ul>
      `;

      container.appendChild(card);
    });

    lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Checkout flow simulator
function openCheckoutModal(planId) {
  state.selectedPlanId = planId;
  const modal = document.getElementById('modal-checkout');
  
  apiFetch('/api/plans').then(plans => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      document.getElementById('checkout-plan-name').innerText = plan.name;
      document.getElementById('checkout-plan-price').innerHTML = `₹${plan.price}<span>/${plan.billingCycle === 'monthly' ? 'month' : 'year'}</span>`;
      modal.classList.add('active');
    }
  }).catch(err => showToast(err.message, 'danger'));
}

function closeCheckoutModal() {
  document.getElementById('modal-checkout').classList.remove('active');
}

async function executeSubscriptionPurchase() {
  const btnText = document.getElementById('checkout-btn-text');
  btnText.innerText = 'Initializing Razorpay...';
  document.getElementById('btn-confirm-checkout').disabled = true;

  try {
    // Check if Razorpay is configured
    const keyRes = await apiFetch('/api/razorpay/key');
    if (!keyRes.key) {
      showToast('Payment gateway is not configured by the admin yet.', 'warning');
      btnText.innerText = 'Pay & Subscribe';
      document.getElementById('btn-confirm-checkout').disabled = false;
      return;
    }

    // Create Order
    const orderRes = await apiFetch('/api/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId: state.selectedPlanId })
    });

    const options = {
      key: keyRes.key,
      amount: orderRes.order.amount,
      currency: orderRes.order.currency,
      name: "ApexCRM SaaS",
      description: `Upgrade to ${orderRes.plan.name}`,
      order_id: orderRes.order.id,
      handler: async function (response) {
        try {
          const verifyRes = await apiFetch('/api/razorpay/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: state.selectedPlanId
            })
          });

          // Update local state user object
          state.currentUser.planId = state.selectedPlanId;
          state.currentUser.planStatus = 'active';
          localStorage.setItem('apex_crm_user', JSON.stringify(state.currentUser));
          
          updateUserProfileUI();
          showToast(`Upgrade success! You are now subscribed to ${orderRes.plan.name}`, 'success');
          closeCheckoutModal();
          switchTab('user-billing');

        } catch (verErr) {
          showToast(verErr.message || 'Payment verification failed', 'danger');
        }
      },
      prefill: {
        name: state.currentUser.name,
        email: state.currentUser.email
      },
      theme: {
        color: "#4f46e5"
      },
      modal: {
        ondismiss: function() {
          btnText.innerText = 'Pay & Subscribe';
          document.getElementById('btn-confirm-checkout').disabled = false;
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response){
        showToast(`Payment Failed: ${response.error.description}`, 'danger');
    });
    rzp.open();

  } catch (err) {
    showToast(err.message, 'danger');
    btnText.innerText = 'Pay & Subscribe';
    document.getElementById('btn-confirm-checkout').disabled = false;
  }
}

// ================= ADMIN ANALYTICS & PLANS SETTINGS =================

async function loadAdminDashboardStats() {
  try {
    const data = await apiFetch('/api/admin/stats');
    state.adminStats = data;

    // Fill metrics
    document.getElementById('admin-stat-mrr').innerText = '₹' + data.totalRevenue.toLocaleString();
    document.getElementById('admin-stat-users').innerText = data.activeUsersCount;
    document.getElementById('admin-stat-tx').innerText = data.totalTransactionsCount;
    document.getElementById('admin-stat-leads').innerText = data.totalLeads;

    // Render Activity log feeds
    renderAdminActivities(data.recentActivities);

    // Initialize Chart.js
    renderAdminCharts(data);

  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderAdminActivities(activities) {
  const container = document.getElementById('admin-activity-feed');
  container.innerHTML = '';

  if (activities.length === 0) {
    container.innerHTML = `<p class="text-muted text-center py-4">No recent activity logs.</p>`;
    return;
  }

  activities.forEach(log => {
    let icon = 'user';
    if (log.action === 'Login') icon = 'log-in';
    if (log.action === 'Registration') icon = 'user-plus';
    if (log.action.includes('Plan')) icon = 'credit-card';
    if (log.action.includes('Lead')) icon = 'briefcase';
    if (log.action.includes('Speech')) icon = 'mic';

    const el = document.createElement('div');
    el.className = 'activity-feed-item';
    el.innerHTML = `
      <div class="activity-feed-icon"><i data-lucide="${icon}"></i></div>
      <div class="activity-feed-content">
        <div class="activity-feed-title">
          <strong>${escapeHtml(log.userName)}</strong> <span>${escapeHtml(log.action)}</span>
        </div>
        <div class="activity-feed-desc">${escapeHtml(log.details)}</div>
        <div class="activity-feed-time">${new Date(log.timestamp).toLocaleTimeString()} &bull; ${new Date(log.timestamp).toLocaleDateString()}</div>
      </div>
    `;
    container.appendChild(el);
  });
  lucide.createIcons();
}

function renderAdminCharts(data) {
  // 1. Line Chart: Revenue
  const revCtx = document.getElementById('chart-revenue').getContext('2d');
  if (state.charts.revenue) {
    state.charts.revenue.destroy();
  }

  const chartLabels = data.revenueChartData.map(d => d.month);
  const chartValues = data.revenueChartData.map(d => d.revenue);

  state.charts.revenue = new Chart(revCtx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'SaaS Earnings (₹)',
        data: chartValues,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // 2. Doughnut Chart: Plans distribution
  const plansCtx = document.getElementById('chart-plans').getContext('2d');
  if (state.charts.plans) {
    state.charts.plans.destroy();
  }

  const planLabels = Object.keys(data.planBreakdown);
  const planValues = Object.values(data.planBreakdown);

  state.charts.plans = new Chart(plansCtx, {
    type: 'doughnut',
    data: {
      labels: planLabels,
      datasets: [{
        data: planValues,
        backgroundColor: ['#e2e8f0', '#4f46e5', '#8b5cf6', '#10b981'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Admin Plans Setup
async function loadAdminPlans() {
  try {
    state.plans = await apiFetch('/api/plans');
    renderAdminPlansTable();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderAdminPlansTable() {
  const tbody = document.getElementById('admin-plans-tbody');
  tbody.innerHTML = '';

  state.plans.forEach(plan => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(plan.name)}</strong></td>
      <td><strong>₹${plan.price}</strong></td>
      <td><span class="status-badge info">${plan.billingCycle}</span></td>
      <td>
        <ul style="list-style:none; font-size:0.8rem; color:var(--text-secondary)">
          ${plan.features.map(f => `<li>&bull; ${escapeHtml(f)}</li>`).join('')}
        </ul>
      </td>
      <td><span class="status-badge ${plan.status === 'active' ? 'success' : 'danger'}">${plan.status}</span></td>
      <td>
        <div class="actions-cell">
          <button onclick="openPlanModal('${plan.id}')" title="Edit Plan"><i data-lucide="edit-3"></i></button>
          <button class="btn-delete-row" onclick="deletePlan('${plan.id}')" title="Delete Plan"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

function openPlanModal(planId = null) {
  state.selectedPlanId = planId;
  const modal = document.getElementById('modal-plan');
  const title = document.getElementById('modal-plan-title');
  const form = document.getElementById('plan-form');

  if (planId) {
    title.innerText = 'Edit Plan Options';
    const plan = state.plans.find(p => p.id === planId);
    if (plan) {
      document.getElementById('plan-form-id').value = plan.id;
      document.getElementById('plan-name').value = plan.name;
      document.getElementById('plan-price').value = plan.price;
      document.getElementById('plan-billing').value = plan.billingCycle;
      document.getElementById('plan-status').value = plan.status;
      document.getElementById('plan-features').value = plan.features.join('\n');
    }
  } else {
    title.innerText = 'Create New SaaS Tier';
    form.reset();
    document.getElementById('plan-form-id').value = '';
  }

  modal.classList.add('active');
  lucide.createIcons();
}

function closePlanModal() {
  document.getElementById('modal-plan').classList.remove('active');
}

async function handlePlanSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('plan-form-id').value;
  
  const featuresStr = document.getElementById('plan-features').value;
  const features = featuresStr.split('\n').map(f => f.trim()).filter(f => f.length > 0);

  const payload = {
    name: document.getElementById('plan-name').value,
    price: Number(document.getElementById('plan-price').value) || 0,
    billingCycle: document.getElementById('plan-billing').value,
    status: document.getElementById('plan-status').value,
    features: features
  };

  try {
    if (id) {
      const updated = await apiFetch(`/api/admin/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const index = state.plans.findIndex(p => p.id === id);
      if (index >= 0) state.plans[index] = updated;
      showToast('SaaS Plan successfully modified', 'success');
    } else {
      const created = await apiFetch('/api/admin/plans', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.plans.push(created);
      showToast('New SaaS Plan registered successfully', 'success');
    }
    
    closePlanModal();
    renderAdminPlansTable();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deletePlan(id) {
  if (!confirm('Are you sure you want to delete this plan? This may affect existing subscribers.')) return;
  try {
    await apiFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
    state.plans = state.plans.filter(p => p.id !== id);
    renderAdminPlansTable();
    showToast('Plan deleted successfully');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// User active log list
async function loadAdminUsers() {
  try {
    const users = await apiFetch('/api/admin/users');
    state.adminUsers = users;
    
    const tbody = document.getElementById('admin-users-tbody');
    tbody.innerHTML = '';

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No clients registered on SaaS platform.</td></tr>`;
      return;
    }

    users.forEach(u => {
      const lastActiveDate = new Date(u.lastActive).toLocaleDateString() + ' ' + new Date(u.lastActive).toLocaleTimeString();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(u.name)}</strong>
          <div style="font-size:0.75rem; color:var(--text-secondary)">${escapeHtml(u.email)}</div>
        </td>
        <td><span class="badge badge-indigo">${escapeHtml(u.planName)}</span></td>
        <td><strong>${u.leadsCount}</strong> Leads</td>
        <td><strong>${u.sttUsageCount}</strong> speech entries</td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td><span style="font-size:0.85rem">${lastActiveDate}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Transaction history ledger
async function loadAdminTransactions() {
  try {
    const txs = await apiFetch('/api/admin/transactions');
    state.adminTransactions = txs;
    
    const tbody = document.getElementById('admin-transactions-tbody');
    tbody.innerHTML = '';

    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No subscription invoices available.</td></tr>`;
      return;
    }

    txs.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${escapeHtml(t.invoiceNo)}</code></td>
        <td><strong>${escapeHtml(t.userName)}</strong></td>
        <td><span class="badge badge-indigo-light">${escapeHtml(t.planName)}</span></td>
        <td><strong>₹${t.amount}</strong></td>
        <td><span class="status-badge info">${t.billingCycle}</span></td>
        <td>${new Date(t.timestamp).toLocaleDateString()} ${new Date(t.timestamp).toLocaleTimeString()}</td>
        <td><span class="status-badge success">${t.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ================= LANDING PAGE PRICING CARDS =================

async function loadLandingPricingPlans() {
  const container = document.getElementById('landing-pricing-cards');
  if (!container) return;

  try {
    const plans = await apiFetch('/api/plans');
    container.innerHTML = '';

    plans.forEach(plan => {
      const card = document.createElement('div');
      card.className = `pricing-card ${plan.id === 'plan_pro' ? 'popular' : ''}`;
      
      let listFeatures = plan.features.map(f => `<li><i data-lucide="check"></i> ${escapeHtml(f)}</li>`).join('');

      card.innerHTML = `
        ${plan.id === 'plan_pro' ? '<span class="popular-badge">Popular Choice</span>' : ''}
        <h3>${escapeHtml(plan.name)}</h3>
        <p class="text-muted">Perfect plan settings</p>
        <div class="pricing-price">₹${plan.price}<span>/${plan.billingCycle === 'monthly' ? 'mo' : 'yr'}</span></div>
        <button class="btn btn-primary btn-block btn-lg" onclick="showView('auth-register')">Get Started</button>
        <ul class="pricing-features">${listFeatures}</ul>
      `;

      container.appendChild(card);
    });

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<p class="text-danger text-center">Failed to load SaaS pricing tiers. Please check backend server connection.</p>`;
  }
}

async function loadAdminTransactions() {
  try {
    const data = await apiFetch('/api/admin/transactions');
    const tbody = document.getElementById('admin-transactions-tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No transactions recorded yet.</td></tr>`;
      return;
    }

    data.forEach(tx => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="badge badge-indigo-light">${tx.invoiceNo}</span></td>
        <td><strong>${escapeHtml(tx.userName)}</strong></td>
        <td>${escapeHtml(tx.planName)}</td>
        <td><span class="badge">${tx.billingCycle}</span></td>
        <td class="font-medium">₹${tx.amount.toLocaleString()}</td>
        <td>${new Date(tx.timestamp).toLocaleString()}</td>
        <td><span class="status-badge success">Success</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function loadAdminSettings() {
  try {
    const data = await apiFetch('/api/admin/settings/razorpay');
    document.getElementById('razorpay-key-id').value = data.keyId || '';
    document.getElementById('razorpay-key-secret').value = data.keySecret || '';
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function saveRazorpaySettings(e) {
  e.preventDefault();
  const keyId = document.getElementById('razorpay-key-id').value.trim();
  const keySecret = document.getElementById('razorpay-key-secret').value.trim();
  
  const btn = document.getElementById('btn-save-razorpay');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = 'Saving...';
  btn.disabled = true;

  try {
    await apiFetch('/api/admin/settings/razorpay', {
      method: 'POST',
      body: JSON.stringify({ keyId, keySecret })
    });
    showToast('Razorpay configuration saved successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

// ================= INITIALIZATION & HELPERS =================

function handleGlobalSearch(query) {
  if (state.currentUser && state.currentUser.role === 'user') {
    // Redirect to pipeline view if not there
    const pipelineActive = document.getElementById('tab-user-pipeline').classList.contains('active');
    if (!pipelineActive) {
      switchTab('user-pipeline');
    }
    renderPipelineLeads(query);
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Check on page load for credentials
window.addEventListener('DOMContentLoaded', () => {
  const storedUser = localStorage.getItem('apex_crm_user');
  if (storedUser) {
    try {
      state.currentUser = JSON.parse(storedUser);
      // Validate session with backend check
      apiFetch('/api/auth/me')
        .then(res => {
          state.currentUser = res.user;
          localStorage.setItem('apex_crm_user', JSON.stringify(state.currentUser));
          updateUserProfileUI();
          showView('app');
        })
        .catch(err => {
          console.error(err);
          handleLogout(); // session expired or backend reset
        });
    } catch (e) {
      localStorage.removeItem('apex_crm_user');
      showView('landing');
    }
  } else {
    showView('landing');
  }
});
