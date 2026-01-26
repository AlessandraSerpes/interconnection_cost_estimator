/**
 * PJM Interconnection Cost Estimator
 * Application Logic with Backend Integration Hooks
 */

// ==========================================================================
// Configuration - MODIFY THESE FOR BACKEND INTEGRATION
// ==========================================================================
const CONFIG = {
    API_ENDPOINT: '/api/quote',  // Change to your REST endpoint
    MOCK_DELAY: 1200,            // Simulated delay in ms
    USE_MOCK: true               // Set FALSE to use real API
};

// ==========================================================================
// Data
// ==========================================================================
const PJM_DATA = {
    states: [
        { code: 'DE', name: 'Delaware' },
        { code: 'IL', name: 'Illinois' },
        { code: 'IN', name: 'Indiana' },
        { code: 'KY', name: 'Kentucky' },
        { code: 'MD', name: 'Maryland' },
        { code: 'MI', name: 'Michigan' },
        { code: 'NC', name: 'North Carolina' },
        { code: 'NJ', name: 'New Jersey' },
        { code: 'OH', name: 'Ohio' },
        { code: 'PA', name: 'Pennsylvania' },
        { code: 'TN', name: 'Tennessee' },
        { code: 'VA', name: 'Virginia' },
        { code: 'WV', name: 'West Virginia' },
        { code: 'DC', name: 'District of Columbia' }
    ],
    counties: {
        'DE': ['Kent', 'New Castle', 'Sussex'],
        'IL': ['Cook', 'DuPage', 'Lake', 'Will', 'Kane', 'McHenry'],
        'IN': ['Marion', 'Lake', 'Allen', 'Hamilton', 'St. Joseph', 'Elkhart'],
        'KY': ['Jefferson', 'Fayette', 'Kenton', 'Boone', 'Campbell', 'Warren'],
        'MD': ['Montgomery', "Prince George's", 'Baltimore', 'Anne Arundel', 'Howard', 'Frederick'],
        'MI': ['Wayne', 'Oakland', 'Macomb', 'Kent', 'Genesee', 'Washtenaw'],
        'NC': ['Mecklenburg', 'Wake', 'Guilford', 'Forsyth', 'Durham', 'Cumberland'],
        'NJ': ['Bergen', 'Middlesex', 'Essex', 'Hudson', 'Monmouth', 'Ocean'],
        'OH': ['Cuyahoga', 'Franklin', 'Hamilton', 'Summit', 'Montgomery', 'Lucas'],
        'PA': ['Philadelphia', 'Allegheny', 'Montgomery', 'Bucks', 'Delaware', 'Lancaster'],
        'TN': ['Shelby', 'Davidson', 'Knox', 'Hamilton', 'Rutherford', 'Williamson'],
        'VA': ['Fairfax', 'Prince William', 'Loudoun', 'Virginia Beach', 'Chesterfield', 'Henrico'],
        'WV': ['Kanawha', 'Berkeley', 'Cabell', 'Monongalia', 'Wood', 'Raleigh'],
        'DC': ['District of Columbia']
    },
    queueYears: [2024, 2023, 2022, 2021, 2020, 2019]
};

// ==========================================================================
// DOM Elements
// ==========================================================================
const dom = {
    form: document.getElementById('estimatorForm'),
    state: document.getElementById('state'),
    county: document.getElementById('county'),
    queueYear: document.getElementById('queueYear'),
    projectSize: document.getElementById('projectSize'),
    fuelType: document.getElementById('fuelType'),
    submitBtn: document.getElementById('submitBtn'),
    placeholder: document.getElementById('placeholder'),
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    totalCost: document.getElementById('totalCost'),
    costPerMW: document.getElementById('costPerMW'),
    costPerKW: document.getElementById('costPerKW'),
    confidenceBadge: document.getElementById('confidenceBadge'),
    notesList: document.getElementById('notesList')
};

// ==========================================================================
// API Functions
// ==========================================================================

/**
 * Main estimation function
 * 
 * To connect to real backend:
 * 1. Set CONFIG.USE_MOCK = false
 * 2. Update CONFIG.API_ENDPOINT to your URL
 * 
 * Expected response shape:
 * {
 *   total_cost_2020_musd: number,    // e.g., 2.23
 *   cost_per_mw_2020_usd: number,    // e.g., 44600
 *   cost_per_kw_2020_usd: number,    // e.g., 44.6
 *   confidence: "high" | "medium" | "low",
 *   notes: string[]
 * }
 */
async function estimateCost(inputs) {
    if (CONFIG.USE_MOCK) {
        return mockEstimateCost(inputs);
    }

    const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Mock API for demo purposes
 */
async function mockEstimateCost(inputs) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.MOCK_DELAY));

    // Base costs by fuel type ($/MW)
    const baseCosts = {
        'solar': 42000,
        'wind': 85000,
        'battery': 35000,
        'solar_battery': 55000,
        'wind_battery': 95000,
        'natural_gas': 65000,
        'other': 50000
    };

    // State multipliers
    const stateMultipliers = {
        'NJ': 1.35, 'MD': 1.25, 'VA': 1.15, 'PA': 1.10,
        'DE': 1.20, 'OH': 0.95, 'IN': 0.90, 'IL': 1.05,
        'MI': 1.00, 'WV': 0.85, 'KY': 0.88, 'NC': 1.08,
        'TN': 0.92, 'DC': 1.40
    };

    // Calculate costs
    const baseCost = baseCosts[inputs.fuelType] || 50000;
    const stateM = stateMultipliers[inputs.state] || 1.0;
    const yearM = 1 + (inputs.queueYear - 2020) * 0.03;
    const sizeM = inputs.projectSize < 50 ? 1.2 : inputs.projectSize < 100 ? 1.0 : 0.9;

    const costPerMW = baseCost * stateM * yearM * sizeM;
    const costPerKW = costPerMW / 1000;
    const totalCost = (costPerMW * inputs.projectSize) / 1000000;

    // Determine confidence
    const highStates = ['PA', 'NJ', 'OH', 'VA', 'MD'];
    const highFuels = ['solar', 'wind', 'battery'];
    let score = 0;
    if (highStates.includes(inputs.state)) score++;
    if (highFuels.includes(inputs.fuelType)) score++;
    if (inputs.queueYear >= 2020 && inputs.queueYear <= 2023) score++;

    const confidence = score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';

    // Generate notes
    const notes = [];
    if (confidence === 'low') {
        notes.push('State-year LMP fallback used (low confidence)');
    }
    if (inputs.projectSize > 200) {
        notes.push('Large project - limited comparable data');
    }
    if (['solar_battery', 'wind_battery'].includes(inputs.fuelType)) {
        notes.push('Hybrid project - storage estimated separately');
    }
    notes.push('All costs in 2020 USD');

    return {
        total_cost_2020_musd: Math.round(totalCost * 100) / 100,
        cost_per_mw_2020_usd: Math.round(costPerMW),
        cost_per_kw_2020_usd: Math.round(costPerKW * 10) / 10,
        confidence: confidence,
        notes: notes
    };
}

// ==========================================================================
// UI Functions
// ==========================================================================

function showState(state) {
    dom.placeholder.style.display = state === 'placeholder' ? 'flex' : 'none';
    dom.loading.classList.toggle('active', state === 'loading');
    dom.results.classList.toggle('active', state === 'results');
}

function displayResults(result) {
    dom.totalCost.textContent = `$${result.total_cost_2020_musd.toFixed(2)}M`;
    dom.costPerMW.textContent = `$${result.cost_per_mw_2020_usd.toLocaleString()}`;
    dom.costPerKW.textContent = `$${result.cost_per_kw_2020_usd.toFixed(2)}`;
    
    dom.confidenceBadge.textContent = result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1);
    dom.confidenceBadge.className = `confidence-badge ${result.confidence}`;
    
    dom.notesList.innerHTML = result.notes.map(n => `<li>${n}</li>`).join('');
    
    showState('results');
}

function populateDropdowns() {
    // Populate states
    PJM_DATA.states.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.code;
        opt.textContent = s.name;
        dom.state.appendChild(opt);
    });

    // Populate queue years
    PJM_DATA.queueYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        dom.queueYear.appendChild(opt);
    });
}

function updateCounties(stateCode) {
    dom.county.innerHTML = '';
    
    if (!stateCode) {
        dom.county.innerHTML = '<option value="">Select state first...</option>';
        dom.county.disabled = true;
        return;
    }

    const counties = PJM_DATA.counties[stateCode] || [];
    dom.county.innerHTML = '<option value="">Select county...</option>';
    
    counties.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        dom.county.appendChild(opt);
    });
    
    dom.county.disabled = false;
}

// ==========================================================================
// Event Handlers
// ==========================================================================

dom.state.addEventListener('change', (e) => {
    updateCounties(e.target.value);
});

dom.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputs = {
        state: dom.state.value,
        county: dom.county.value,
        queueYear: parseInt(dom.queueYear.value),
        projectSize: parseFloat(dom.projectSize.value),
        fuelType: dom.fuelType.value
    };

    dom.submitBtn.disabled = true;
    dom.submitBtn.textContent = 'Calculating...';
    showState('loading');

    try {
        const result = await estimateCost(inputs);
        displayResults(result);
    } catch (err) {
        console.error('Estimation error:', err);
        alert('Error calculating estimate. Please try again.');
        showState('placeholder');
    } finally {
        dom.submitBtn.disabled = false;
        dom.submitBtn.textContent = 'Estimate Cost';
    }
});

// ==========================================================================
// Initialize
// ==========================================================================
populateDropdowns();
showState('placeholder');

// Expose for external use
window.InterconnectionEstimator = {
    estimateCost,
    CONFIG
};

console.log('Interconnection Estimator initialized. Mock mode:', CONFIG.USE_MOCK);
