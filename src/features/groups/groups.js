/**
 * Groups Page Module
 * Manages group creation, editing, and member management
 * Groups are used for multi-signature/committee-based token governance
 */

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let selectedGroupId = null;

// Helper to get fresh element references
const $ = (id) => document.getElementById(id);

// ═══════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate unique group ID
 * @returns {string} Unique group ID
 */
export function generateGroupId() {
  return 'group-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Generate unique member ID
 * @returns {string} Unique member ID
 */
export function generateMemberId() {
  return 'member-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA ACCESS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get groups from wizardState
 * @returns {Array} Array of groups
 */
export function getGroups() {
  if (!window.wizardState || !window.wizardState.form || !window.wizardState.form.permissions) {
    return [];
  }
  return window.wizardState.form.permissions.groups || [];
}

/**
 * Save groups to wizardState
 * @param {Array} groups - Array of groups
 */
export function saveGroups(groups) {
  if (!window.wizardState || !window.wizardState.form || !window.wizardState.form.permissions) {
    console.error('[GroupsPage] wizardState not available');
    return;
  }
  window.wizardState.form.permissions.groups = groups;
  if (typeof window.persistState === 'function') {
    window.persistState();
  }
  // Update group selectors in permissions dropdowns
  if (typeof window.updateGroupSelectors === 'function') {
    window.updateGroupSelectors();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get display name for a group (numbered for unnamed groups)
 * @param {object} group - Group object
 * @param {Array} allGroups - All groups for numbering unnamed ones
 * @returns {string} Display name
 */
export function getGroupDisplayName(group, allGroups) {
  if (group.name && group.name.trim() !== '' && !group.name.startsWith('Unnamed Group')) {
    return group.name;
  }
  // Find the position of this unnamed group among all unnamed groups
  const unnamedGroups = allGroups.filter(g => !g.name || g.name.trim() === '' || g.name.startsWith('Unnamed Group'));
  const unnamedIndex = unnamedGroups.findIndex(g => g.id === group.id) + 1;
  return `Unnamed Group ${unnamedIndex}`;
}

/**
 * Sort groups: named groups first (alphabetically), then unnamed groups by creation order
 * @param {Array} groups - Array of groups
 * @returns {Array} Sorted groups
 */
export function getSortedGroups(groups) {
  return [...groups].sort((a, b) => {
    const aIsUnnamed = !a.name || a.name.trim() === '' || a.name.startsWith('Unnamed Group');
    const bIsUnnamed = !b.name || b.name.trim() === '' || b.name.startsWith('Unnamed Group');

    if (aIsUnnamed && !bIsUnnamed) return 1;  // Unnamed goes after named
    if (!aIsUnnamed && bIsUnnamed) return -1; // Named goes before unnamed
    if (!aIsUnnamed && !bIsUnnamed) {
      // Both named - sort alphabetically
      return a.name.localeCompare(b.name);
    }
    // Both unnamed - keep original order (by index in original array)
    return groups.indexOf(a) - groups.indexOf(b);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate Base58 identity ID
 * @param {string} rawValue - Identity ID string
 * @returns {object} Validation result with valid boolean and message
 */
export function validateBase58Identity(rawValue) {
  const trimmed = (rawValue || '').trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Identity ID is required' };
  }
  if (trimmed.length < 43 || trimmed.length > 44) {
    return { valid: false, message: 'Must be 43-44 characters' };
  }
  // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
  if (!base58Pattern.test(trimmed)) {
    return { valid: false, message: 'Invalid Base58 format' };
  }
  return { valid: true, message: 'Valid identity' };
}

/**
 * Validate a group
 * @param {object} group - Group object
 * @returns {object} Validation result with valid boolean and message
 */
export function validateGroup(group) {
  const errors = [];

  // Check if group has members
  if (!group.members || group.members.length === 0) {
    errors.push('Group needs at least one member');
  }

  // Check if required power is set
  const requiredPower = parseInt(group.requiredPower, 10) || 0;
  if (requiredPower <= 0) {
    errors.push('Required power must be greater than 0');
  }

  // Check if total power meets required power
  const totalPower = (group.members || []).reduce((sum, m) => sum + (parseInt(m.power, 10) || 0), 0);
  if (totalPower < requiredPower) {
    errors.push(`Total member power (${totalPower}) is less than required (${requiredPower})`);
  }

  // Check if all members have valid identities (Base58)
  const invalidIdentityMembers = (group.members || []).filter(m => {
    const validation = validateBase58Identity(m.identity);
    return !validation.valid;
  });
  if (invalidIdentityMembers.length > 0) {
    errors.push(`${invalidIdentityMembers.length} member(s) with invalid identity`);
  }

  // Check if all members have power > 0
  const zeroPowerMembers = (group.members || []).filter(m => !m.power || parseInt(m.power, 10) <= 0);
  if (zeroPowerMembers.length > 0) {
    errors.push(`${zeroPowerMembers.length} member(s) have no voting power`);
  }

  return {
    valid: errors.length === 0,
    message: errors.join('; ') || 'Group is valid'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escape HTML for safe rendering
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Toast type (info, success, warning, error)
 */
function showToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    console.log(`[Toast] ${type}: ${message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render the groups list
 */
export function renderGroupsList() {
  const groups = getGroups();
  const sortedGroups = getSortedGroups(groups);
  const groupsList = $('groups-list');
  const groupsEmpty = $('groups-empty');
  const groupsCount = $('groups-count');

  // Update count
  if (groupsCount) {
    groupsCount.textContent = groups.length;
  }

  // Show/hide empty state
  if (groupsEmpty) {
    groupsEmpty.hidden = groups.length > 0;
  }

  if (!groupsList) return;

  // Clear existing items (except empty state)
  const existingItems = groupsList.querySelectorAll('.groups-list__item');
  existingItems.forEach(item => item.remove());

  // Render each group (sorted)
  sortedGroups.forEach((group) => {
    const item = document.createElement('button');
    item.className = 'groups-list__item';
    item.type = 'button';
    item.dataset.groupId = group.id;
    if (group.id === selectedGroupId) {
      item.classList.add('groups-list__item--active');
    }

    const memberCount = Array.isArray(group.members) ? group.members.length : 0;
    const totalPower = Array.isArray(group.members)
      ? group.members.reduce((sum, m) => sum + (parseInt(m.power, 10) || 0), 0)
      : 0;
    const displayName = getGroupDisplayName(group, groups);
    const validationStatus = validateGroup(group);

    item.innerHTML = `
      <div class="groups-list__item-icon ${validationStatus.valid ? 'groups-list__item-icon--valid' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <div class="groups-list__item-content">
        <div class="groups-list__item-name">${escapeHtml(displayName)}</div>
        <div class="groups-list__item-meta">${memberCount} member${memberCount !== 1 ? 's' : ''} · Power: ${totalPower}/${group.requiredPower || 0}</div>
      </div>
      ${!validationStatus.valid ? `<div class="groups-list__item-warning" title="${escapeHtml(validationStatus.message)}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4M12 17h.01M12 3l9.5 16.5H2.5L12 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>` : ''}
    `;

    item.addEventListener('click', () => selectGroup(group.id));
    groupsList.appendChild(item);
  });
}

/**
 * Render member rows
 * @param {Array} members - Array of group members
 */
function renderMembers(members) {
  const groupMembersList = $('gp-members-list');
  const groupMembersEmpty = $('gp-members-empty');

  if (!groupMembersList) {
    return;
  }

  groupMembersList.innerHTML = '';

  // Hide empty state when we have members
  if (groupMembersEmpty) {
    groupMembersEmpty.hidden = members.length > 0;
  }

  members.forEach((member, index) => {
    const row = document.createElement('div');
    row.className = 'groups-member';
    row.dataset.memberId = member.id;

    // Validate identity
    const identityValidation = validateBase58Identity(member.identity);
    const identityStatusClass = member.identity && member.identity.trim()
      ? (identityValidation.valid ? 'groups-member__identity--valid' : 'groups-member__identity--invalid')
      : '';

    row.innerHTML = `
      <div class="groups-member__number">${index + 1}</div>
      <div class="groups-member__identity ${identityStatusClass}">
        <input type="text"
               class="groups-member__identity-input"
               placeholder="Enter Base58 Identity ID (43-44 chars)"
               value="${escapeHtml(member.identity || '')}"
               data-field="identity"
               spellcheck="false"
               autocomplete="off">
        <span class="groups-member__identity-status" title="${escapeHtml(identityValidation.message)}">
          ${identityValidation.valid && member.identity ? `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          ` : member.identity ? `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          ` : ''}
        </span>
      </div>
      <div class="groups-member__power">
        <input type="text"
               class="groups-member__power-input"
               placeholder="Power"
               value="${escapeHtml(String(member.power || ''))}"
               inputmode="numeric"
               pattern="[0-9]*"
               data-field="power">
      </div>
      <button type="button" class="groups-member__remove-btn" data-action="remove" title="Remove member">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    // Add event listeners
    const identityInput = row.querySelector('[data-field="identity"]');
    const powerInput = row.querySelector('[data-field="power"]');
    const removeBtn = row.querySelector('[data-action="remove"]');

    identityInput.addEventListener('input', () => {
      updateMemberField(member.id, 'identity', identityInput.value);
      // Re-render to update validation status
      const groups = getGroups();
      const group = groups.find(g => g.id === selectedGroupId);
      if (group) {
        renderMembers(group.members);
      }
    });

    identityInput.addEventListener('blur', () => {
      updateSummary();
      renderGroupsList(); // Update list to show validation
    });

    powerInput.addEventListener('input', () => {
      updateMemberField(member.id, 'power', powerInput.value);
      updateSummary();
    });

    powerInput.addEventListener('blur', () => {
      renderGroupsList(); // Update list to show validation
    });

    removeBtn.addEventListener('click', () => {
      removeMember(member.id);
    });

    groupMembersList.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update member field in current group
 * @param {string} memberId - Member ID
 * @param {string} field - Field name
 * @param {*} value - New value
 */
function updateMemberField(memberId, field, value) {
  if (!selectedGroupId) return;

  const groups = getGroups();
  const group = groups.find(g => g.id === selectedGroupId);
  if (!group || !group.members) return;

  const member = group.members.find(m => m.id === memberId);
  if (!member) return;

  member[field] = value;
  // Don't save yet - wait for explicit save
}

/**
 * Add a new member to current group
 */
export function addMember() {
  if (!selectedGroupId) {
    showToast('Please select a group first', 'warning');
    return;
  }

  const groups = getGroups();
  const group = groups.find(g => g.id === selectedGroupId);
  if (!group) {
    return;
  }

  if (!Array.isArray(group.members)) {
    group.members = [];
  }

  const newMember = {
    id: generateMemberId(),
    identity: '',
    power: ''
  };

  group.members.push(newMember);
  renderMembers(group.members);
  updateSummary();

  // Focus the new identity input
  const gpMembersList = $('gp-members-list');
  if (gpMembersList) {
    const newRow = gpMembersList.querySelector(`[data-member-id="${newMember.id}"]`);
    if (newRow) {
      const input = newRow.querySelector('[data-field="identity"]');
      if (input) input.focus();
    }
  }
}

/**
 * Remove a member from current group
 * @param {string} memberId - Member ID
 */
function removeMember(memberId) {
  if (!selectedGroupId) return;

  const groups = getGroups();
  const group = groups.find(g => g.id === selectedGroupId);
  if (!group || !group.members) return;

  const index = group.members.findIndex(m => m.id === memberId);
  if (index !== -1) {
    group.members.splice(index, 1);
    renderMembers(group.members);
    updateSummary();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update the summary display
 */
function updateSummary() {
  if (!selectedGroupId) return;

  const groups = getGroups();
  const group = groups.find(g => g.id === selectedGroupId);
  if (!group) return;

  const groupEditThreshold = $('group-edit-threshold');
  const groupTotalMembers = $('gp-total-members');
  const groupTotalPower = $('gp-total-power');
  const groupRequiredPower = $('gp-required-power');

  const members = Array.isArray(group.members) ? group.members : [];
  const totalMembers = members.length;
  const totalPower = members.reduce((sum, m) => sum + (parseInt(m.power, 10) || 0), 0);
  const requiredPower = parseInt(groupEditThreshold?.value, 10) || 0;

  if (groupTotalMembers) groupTotalMembers.textContent = totalMembers;
  if (groupTotalPower) groupTotalPower.textContent = totalPower;
  if (groupRequiredPower) groupRequiredPower.textContent = requiredPower;
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Select a group for editing
 * @param {string} groupId - Group ID
 */
export function selectGroup(groupId) {
  const groups = getGroups();
  const group = groups.find(g => g.id === groupId);

  if (!group) {
    console.error('[GroupsPage] Group not found:', groupId);
    return;
  }

  const displayName = getGroupDisplayName(group, groups);
  console.log('[GroupsPage] Selecting group:', groupId, displayName);
  selectedGroupId = groupId;

  const groupsList = $('groups-list');
  const groupEditorEmpty = $('group-editor-empty');
  const groupEditorContent = $('group-editor-content');
  const groupDeleteBtn = $('group-delete-btn');
  const groupEditorStatusText = $('group-editor-status-text');
  const groupEditorStatus = $('group-editor-status');
  const groupEditName = $('group-edit-name');
  const groupEditThreshold = $('group-edit-threshold');

  // Update list active state
  if (groupsList) {
    groupsList.querySelectorAll('.groups-list__item').forEach(item => {
      item.classList.toggle('groups-list__item--active', item.dataset.groupId === groupId);
    });
  }

  // Show editor content
  if (groupEditorEmpty) groupEditorEmpty.hidden = true;
  if (groupEditorContent) groupEditorContent.hidden = false;
  if (groupDeleteBtn) groupDeleteBtn.hidden = false;

  // Validate and update status
  const validationStatus = validateGroup(group);
  if (groupEditorStatusText) {
    groupEditorStatusText.textContent = 'Editing: ' + displayName;
  }
  if (groupEditorStatus) {
    groupEditorStatus.classList.toggle('groups-editor__status--editing', true);
    groupEditorStatus.classList.toggle('groups-editor__status--valid', validationStatus.valid);
    groupEditorStatus.classList.toggle('groups-editor__status--invalid', !validationStatus.valid);
  }

  // Populate form - use actual name (not display name) so user can edit it
  if (groupEditName) groupEditName.value = group.name || '';
  if (groupEditThreshold) groupEditThreshold.value = group.requiredPower || '';

  // Render members
  renderMembers(group.members || []);
  updateSummary();
}

/**
 * Create a new group
 */
export function createGroup() {
  console.log('[GroupsPage] Creating new group...');

  const newGroup = {
    id: generateGroupId(),
    name: '',
    requiredPower: '',
    members: []
  };

  const groups = getGroups();
  groups.push(newGroup);
  saveGroups(groups);

  renderGroupsList();
  selectGroup(newGroup.id);

  // Focus the name input
  const groupEditName = $('group-edit-name');
  if (groupEditName) {
    setTimeout(() => groupEditName.focus(), 50);
  }
}

/**
 * Save the current group
 */
export function saveCurrentGroup() {
  if (!selectedGroupId) return;

  const groups = getGroups();
  const group = groups.find(g => g.id === selectedGroupId);
  if (!group) return;

  const groupEditName = $('group-edit-name');
  const groupEditThreshold = $('group-edit-threshold');
  const groupEditorStatusText = $('group-editor-status-text');

  // Update from form
  group.name = groupEditName?.value?.trim() || '';
  group.requiredPower = groupEditThreshold?.value?.trim() || '';

  // Validate
  if (!group.name) {
    showToast('Please enter a group name', 'warning');
    if (groupEditName) groupEditName.focus();
    return;
  }

  saveGroups(groups);
  renderGroupsList();

  // Update group selectors throughout the wizard
  if (typeof window.updateGroupSelectors === 'function') {
    window.updateGroupSelectors();
  }

  // Update status
  if (groupEditorStatusText) {
    groupEditorStatusText.textContent = 'Saved: ' + group.name;
  }

  showToast('Group saved successfully', 'success');

  // Also update the permission groups UI if it exists
  if (typeof window.renderPermissionGroups === 'function') {
    window.renderPermissionGroups();
  }
}

/**
 * Delete the current group
 */
export function deleteCurrentGroup() {
  if (!selectedGroupId) return;

  const groups = getGroups();
  const group = groups.find(g => g.id === selectedGroupId);
  if (!group) return;

  if (!confirm(`Are you sure you want to delete "${group.name || 'this group'}"? This cannot be undone.`)) {
    return;
  }

  const index = groups.findIndex(g => g.id === selectedGroupId);
  if (index !== -1) {
    groups.splice(index, 1);
    saveGroups(groups);
  }

  selectedGroupId = null;

  const groupEditorEmpty = $('group-editor-empty');
  const groupEditorContent = $('group-editor-content');
  const groupDeleteBtn = $('group-delete-btn');
  const groupEditorStatusText = $('group-editor-status-text');

  // Reset editor
  if (groupEditorEmpty) groupEditorEmpty.hidden = false;
  if (groupEditorContent) groupEditorContent.hidden = true;
  if (groupDeleteBtn) groupDeleteBtn.hidden = true;
  if (groupEditorStatusText) groupEditorStatusText.textContent = 'No group selected';

  renderGroupsList();

  // Update group selectors throughout the wizard
  if (typeof window.updateGroupSelectors === 'function') {
    window.updateGroupSelectors();
  }

  showToast('Group deleted', 'success');

  // Also update the permission groups UI if it exists
  if (typeof window.renderPermissionGroups === 'function') {
    window.renderPermissionGroups();
  }
}

/**
 * Cancel editing
 */
export function cancelEditing() {
  selectedGroupId = null;

  const groupsList = $('groups-list');
  const groupEditorEmpty = $('group-editor-empty');
  const groupEditorContent = $('group-editor-content');
  const groupDeleteBtn = $('group-delete-btn');
  const groupEditorStatusText = $('group-editor-status-text');

  // Reset editor
  if (groupEditorEmpty) groupEditorEmpty.hidden = false;
  if (groupEditorContent) groupEditorContent.hidden = true;
  if (groupDeleteBtn) groupDeleteBtn.hidden = true;
  if (groupEditorStatusText) groupEditorStatusText.textContent = 'No group selected';

  // Clear active state
  if (groupsList) {
    groupsList.querySelectorAll('.groups-list__item').forEach(item => {
      item.classList.remove('groups-list__item--active');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const createGroupBtn = $('create-group-btn');
  const groupAddMemberBtn = $('group-add-member-btn');
  const groupSaveBtn = $('group-save-btn');
  const groupCancelBtn = $('group-cancel-btn');
  const groupDeleteBtn = $('group-delete-btn');
  const groupEditThreshold = $('group-edit-threshold');
  const groupsBackToHub = $('groups-back-to-hub');

  // Create group button
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', createGroup);
  }

  // Add member button
  if (groupAddMemberBtn) {
    groupAddMemberBtn.addEventListener('click', addMember);
  }

  // Save button
  if (groupSaveBtn) {
    groupSaveBtn.addEventListener('click', saveCurrentGroup);
  }

  // Cancel button
  if (groupCancelBtn) {
    groupCancelBtn.addEventListener('click', cancelEditing);
  }

  // Delete button
  if (groupDeleteBtn) {
    groupDeleteBtn.addEventListener('click', deleteCurrentGroup);
  }

  // Threshold input - update summary on change
  if (groupEditThreshold) {
    groupEditThreshold.addEventListener('input', updateSummary);
  }

  // Back to hub button
  if (groupsBackToHub) {
    groupsBackToHub.addEventListener('click', () => {
      // Show hub page
      const hubPage = document.getElementById('hub-page');
      const globalHeader = document.getElementById('global-header');
      const wizardShell = document.getElementById('wizard-shell');

      if (hubPage) hubPage.hidden = false;
      if (globalHeader) globalHeader.hidden = true;
      if (wizardShell) wizardShell.hidden = true;

      document.body.classList.remove('fullpage-mode');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize the groups page
 */
export function initGroupsPage() {
  // Check if page exists at init time
  if (!$('groups-list')) {
    console.log('[GroupsPage] Groups page elements not found, skipping initialization');
    return;
  }

  console.log('[GroupsPage] Initializing groups page...');

  setupEventListeners();
  renderGroupsList();

  console.log('[GroupsPage] Groups page initialized');
}

/**
 * Get the selected group ID
 * @returns {string|null} Selected group ID
 */
export function getSelectedGroupId() {
  return selectedGroupId;
}

/**
 * Get the count of groups
 * @returns {number} Group count
 */
export function getGroupCount() {
  return getGroups().length;
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL EXPOSURE
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.GroupsPage = {
    init: initGroupsPage,
    render: renderGroupsList,
    getCount: getGroupCount,
    selectGroup,
    createGroup,
    saveCurrentGroup,
    deleteCurrentGroup,
    cancelEditing,
    addMember,
    validateGroup,
    validateBase58Identity,
    getGroups,
    saveGroups
  };
}
