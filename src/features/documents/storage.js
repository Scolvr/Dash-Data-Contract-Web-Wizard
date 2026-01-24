/**
 * Document Storage Module
 * Handles CRUD operations for saved token configurations
 *
 * Documents are stored in localStorage with the following structure:
 * {
 *   id: string,
 *   name: string,
 *   notes: string,
 *   createdAt: ISO date string,
 *   updatedAt: ISO date string,
 *   data: wizard form state
 * }
 */

const STORAGE_KEY = 'dash-wizard-documents';

// In-memory cache of documents
let documents = [];

// Event listeners for document changes
const listeners = new Set();

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load documents from localStorage
 * @returns {Array} Array of documents
 */
export function loadDocuments() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    documents = stored ? JSON.parse(stored) : [];
    console.log('[DocumentStorage] Loaded', documents.length, 'documents');
  } catch (e) {
    console.error('[DocumentStorage] Error loading documents:', e);
    documents = [];
  }
  return documents;
}

/**
 * Save documents to localStorage
 */
export function saveDocuments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    console.log('[DocumentStorage] Saved', documents.length, 'documents');
    notifyListeners();
  } catch (e) {
    console.error('[DocumentStorage] Error saving documents:', e);
    throw new Error('Failed to save documents');
  }
}

/**
 * Get all documents
 * @returns {Array} Array of documents
 */
export function getAllDocuments() {
  if (documents.length === 0) {
    loadDocuments();
  }
  return [...documents];
}

/**
 * Get document count
 * @returns {number} Number of documents
 */
export function getDocumentCount() {
  return documents.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique document ID
 * @returns {string} Unique ID
 */
export function generateDocumentId() {
  return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new document
 * @param {string} name - Document name
 * @param {string} notes - Optional notes
 * @param {object} data - Wizard form data to save
 * @returns {object} Created document
 */
export function createDocument(name, notes, data) {
  const doc = {
    id: generateDocumentId(),
    name: name.trim(),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(data)) // Deep clone
  };
  documents.unshift(doc); // Add to beginning
  saveDocuments();
  return doc;
}

/**
 * Get a document by ID
 * @param {string} id - Document ID
 * @returns {object|undefined} Document or undefined if not found
 */
export function getDocument(id) {
  return documents.find(d => d.id === id);
}

/**
 * Update a document
 * @param {string} id - Document ID
 * @param {object} updates - Fields to update
 * @returns {object|null} Updated document or null if not found
 */
export function updateDocument(id, updates) {
  const index = documents.findIndex(d => d.id === id);
  if (index !== -1) {
    documents[index] = {
      ...documents[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDocuments();
    return documents[index];
  }
  return null;
}

/**
 * Delete a document
 * @param {string} id - Document ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteDocument(id) {
  const index = documents.findIndex(d => d.id === id);
  if (index !== -1) {
    documents.splice(index, 1);
    saveDocuments();
    return true;
  }
  return false;
}

/**
 * Search documents by name, notes, or token name
 * @param {string} query - Search query
 * @returns {Array} Matching documents
 */
export function searchDocuments(query) {
  if (!query || !query.trim()) {
    return getAllDocuments();
  }

  const search = query.toLowerCase().trim();
  return documents.filter(doc =>
    doc.name.toLowerCase().includes(search) ||
    (doc.notes && doc.notes.toLowerCase().includes(search)) ||
    (doc.data?.tokenName && doc.data.tokenName.toLowerCase().includes(search))
  );
}

/**
 * Clear all documents
 * @returns {boolean} Success status
 */
export function clearAllDocuments() {
  try {
    documents = [];
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
    return true;
  } catch (e) {
    console.error('[DocumentStorage] Error clearing documents:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT/EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export a document as JSON string
 * @param {string} id - Document ID
 * @returns {string|null} JSON string or null if not found
 */
export function exportDocument(id) {
  const doc = getDocument(id);
  if (!doc) return null;
  return JSON.stringify(doc.data, null, 2);
}

/**
 * Export all documents as JSON string
 * @returns {string} JSON string of all documents
 */
export function exportAllDocuments() {
  return JSON.stringify(documents, null, 2);
}

/**
 * Import documents from JSON string
 * @param {string} jsonString - JSON string of documents
 * @param {boolean} merge - Whether to merge with existing (true) or replace (false)
 * @returns {number} Number of documents imported
 */
export function importDocuments(jsonString, merge = true) {
  try {
    const imported = JSON.parse(jsonString);

    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected array of documents');
    }

    if (merge) {
      // Add imported documents, avoiding duplicates by ID
      const existingIds = new Set(documents.map(d => d.id));
      const newDocs = imported.filter(doc => !existingIds.has(doc.id));
      documents = [...newDocs, ...documents];
    } else {
      documents = imported;
    }

    saveDocuments();
    return imported.length;
  } catch (e) {
    console.error('[DocumentStorage] Error importing documents:', e);
    throw new Error('Failed to import documents: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get token summary from document data
 * @param {object} data - Document data (wizard form state)
 * @returns {Array} Summary items
 */
export function getTokenSummary(data) {
  const summary = [];
  if (data?.tokenName) {
    summary.push({ label: 'Token', value: data.tokenName, primary: true });
  }
  if (data?.permissions?.baseSupply) {
    const supply = parseInt(data.permissions.baseSupply).toLocaleString();
    summary.push({ label: 'Supply', value: supply });
  }
  if (data?.permissions?.decimals !== undefined) {
    summary.push({ label: 'Decimals', value: data.permissions.decimals });
  }
  return summary;
}

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatRelativeDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const mins = Math.floor(diff / (1000 * 60));
      return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTENER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add a listener for document changes
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export function addDocumentListener(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of document changes
 */
function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(documents);
    } catch (e) {
      console.error('[DocumentStorage] Listener error:', e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS FOR GLOBAL ACCESS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.DocumentStorage = {
    load: loadDocuments,
    save: saveDocuments,
    getAll: getAllDocuments,
    get: getDocument,
    create: createDocument,
    update: updateDocument,
    delete: deleteDocument,
    search: searchDocuments,
    clear: clearAllDocuments,
    export: exportDocument,
    exportAll: exportAllDocuments,
    import: importDocuments,
    getSummary: getTokenSummary,
    formatDate: formatRelativeDate,
    addListener: addDocumentListener,
    count: getDocumentCount
  };
}
