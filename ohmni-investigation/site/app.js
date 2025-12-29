// Ohmni Investigation Frontend

let allLeads = [];
let allEntities = [];
let allEvidence = [];
let casebookManifest = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderLeads();
    updateStats();
    
    // Set up event listeners
    document.getElementById('search-leads').addEventListener('input', renderLeads);
    document.getElementById('filter-status').addEventListener('change', renderLeads);
    document.getElementById('search-entities').addEventListener('input', renderEntities);
    document.getElementById('search-evidence').addEventListener('input', renderEvidence);
});

// Load data from JSON files
async function loadData() {
    try {
        const [leadsRes, entitiesRes, evidenceRes, casebookRes] = await Promise.all([
            fetch('data/leads.json'),
            fetch('data/entities.json'),
            fetch('data/evidence.json'),
            fetch('casebook/manifest.json')
        ]);
        
        allLeads = await leadsRes.json();
        allEntities = await entitiesRes.json();
        allEvidence = await evidenceRes.json();
        casebookManifest = await casebookRes.json();
        
        // Sort leads by confidence descending
        allLeads.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Update summary stats
function updateStats() {
    document.getElementById('stat-leads').textContent = allLeads.length;
    document.getElementById('stat-entities').textContent = allEntities.length;
    document.getElementById('stat-evidence').textContent = allEvidence.length;
    
    // Find most recent update
    let latestDate = null;
    [...allLeads, ...allEntities, ...allEvidence].forEach(item => {
        const itemDate = new Date(item.updated_at);
        if (!latestDate || itemDate > latestDate) {
            latestDate = itemDate;
        }
    });
    
    if (latestDate) {
        const formatted = latestDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        document.getElementById('stat-updated').textContent = formatted;
        document.getElementById('footer-updated').textContent = formatted;
    }
}

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Remove active state from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // Activate button
    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.classList.add('border-blue-600', 'text-blue-600');
    activeBtn.classList.remove('border-transparent', 'text-gray-500');
    
    // Render content
    if (tabName === 'leads') renderLeads();
    if (tabName === 'casebook') renderCasebook();
    if (tabName === 'entities') renderEntities();
    if (tabName === 'evidence') renderEvidence();
}

// Render leads
function renderLeads() {
    const searchTerm = document.getElementById('search-leads').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    
    let filtered = allLeads.filter(lead => {
        const matchesSearch = !searchTerm || 
            lead.title.toLowerCase().includes(searchTerm) ||
            lead.summary.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || lead.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    const container = document.getElementById('leads-list');
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="p-6 text-gray-500">No leads found</div>';
        return;
    }
    
    filtered.forEach(lead => {
        const statusColors = {
            'needs_data': 'bg-gray-100 text-gray-800',
            'under_review': 'bg-blue-100 text-blue-800',
            'escalate_for_review': 'bg-red-100 text-red-800',
            'resolved': 'bg-green-100 text-green-800',
            'closed': 'bg-gray-100 text-gray-600'
        };
        
        const statusColor = statusColors[lead.status] || 'bg-gray-100 text-gray-800';
        
        const div = document.createElement('div');
        div.className = 'p-6 hover:bg-gray-50';
        div.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                        <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(lead.title)}</h3>
                        <span class="px-2 py-1 text-xs font-medium rounded ${statusColor}">
                            ${lead.status.replace(/_/g, ' ')}
                        </span>
                        <span class="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                            ${lead.signal_category.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <p class="text-gray-700 mb-3">${escapeHtml(lead.summary)}</p>
                    
                    <div class="space-y-2 text-sm">
                        <div>
                            <span class="font-medium text-gray-700">Confidence:</span>
                            <span class="text-gray-900">${(lead.confidence * 100).toFixed(0)}%</span>
                        </div>
                        
                        <div>
                            <span class="font-medium text-gray-700">Evidence IDs:</span>
                            <span class="text-gray-600">${lead.evidence_ids.join(', ')}</span>
                        </div>
                        
                        <div>
                            <span class="font-medium text-green-700">Innocent Explanations:</span>
                            <ul class="list-disc list-inside text-gray-700 mt-1">
                                ${lead.innocent_explanations.map(exp => `<li>${escapeHtml(exp)}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div>
                            <span class="font-medium text-blue-700">Next Tests:</span>
                            <ul class="list-disc list-inside text-gray-700 mt-1">
                                ${lead.next_tests.map(test => `<li>${escapeHtml(test)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Render casebook
function renderCasebook() {
    const container = document.getElementById('casebook-list');
    container.innerHTML = '';
    
    if (!casebookManifest || !casebookManifest.entries || casebookManifest.entries.length === 0) {
        container.innerHTML = '<div class="text-gray-500">No casebook entries yet</div>';
        return;
    }
    
    casebookManifest.entries.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'border-l-4 border-blue-500 pl-4 py-2';
        div.innerHTML = `
            <a href="casebook/${entry.file}" class="text-lg font-medium text-blue-600 hover:text-blue-800">
                ${entry.date}
            </a>
        `;
        container.appendChild(div);
    });
}

// Render entities
function renderEntities() {
    const searchTerm = document.getElementById('search-entities').value.toLowerCase();
    
    let filtered = allEntities.filter(entity => {
        return !searchTerm ||
            entity.primary_name.toLowerCase().includes(searchTerm) ||
            entity.aliases.some(alias => alias.toLowerCase().includes(searchTerm));
    });
    
    const container = document.getElementById('entities-list');
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="p-6 text-gray-500">No entities found</div>';
        return;
    }
    
    filtered.forEach(entity => {
        const div = document.createElement('div');
        div.className = 'p-6 hover:bg-gray-50';
        div.innerHTML = `
            <div>
                <div class="flex items-center space-x-3 mb-2">
                    <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(entity.primary_name)}</h3>
                    <span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        ${entity.entity_type.replace(/_/g, ' ')}
                    </span>
                </div>
                
                ${entity.aliases.length > 0 ? `
                    <div class="text-sm text-gray-600 mb-2">
                        <span class="font-medium">Aliases:</span> ${entity.aliases.join(', ')}
                    </div>
                ` : ''}
                
                <div class="text-sm text-gray-700 mb-2">
                    <span class="font-medium">Roles:</span> ${entity.roles.join(', ')}
                </div>
                
                ${entity.jurisdiction ? `
                    <div class="text-sm text-gray-600">
                        <span class="font-medium">Jurisdiction:</span> ${entity.jurisdiction}
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

// Render evidence
function renderEvidence() {
    const searchTerm = document.getElementById('search-evidence').value.toLowerCase();
    
    let filtered = allEvidence.filter(ev => {
        return !searchTerm ||
            ev.title.toLowerCase().includes(searchTerm) ||
            ev.summary.toLowerCase().includes(searchTerm);
    });
    
    const container = document.getElementById('evidence-list');
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="p-6 text-gray-500">No evidence found</div>';
        return;
    }
    
    filtered.forEach(ev => {
        const div = document.createElement('div');
        div.className = 'p-6 hover:bg-gray-50';
        div.innerHTML = `
            <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">
                    <a href="${ev.source_url}" target="_blank" class="text-blue-600 hover:text-blue-800">
                        ${escapeHtml(ev.title)}
                    </a>
                </h3>
                <p class="text-gray-700 mb-2">${escapeHtml(ev.summary)}</p>
                <div class="text-sm text-gray-600">
                    <span class="font-medium">Evidence ID:</span> ${ev.evidence_id}
                    ${ev.published_date ? ` | <span class="font-medium">Published:</span> ${ev.published_date}` : ''}
                    | <span class="font-medium">Tags:</span> ${ev.relevance_tags.join(', ')}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Utility: escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

