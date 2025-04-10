// DOM Elements
const cardForm = document.getElementById('add-card-form');
const cardList = document.getElementById('card-list');
const searchInput = document.getElementById('search-input');
const rarityFilter = document.getElementById('filter-rarity');
const setFilter = document.getElementById('filter-set');
const clearFiltersBtn = document.getElementById('clear-filters');
const cardModal = document.getElementById('card-modal');
const cardDetails = document.getElementById('card-details');
const closeModalBtn = document.querySelector('.close');
const pokemonSelect = document.getElementById('pokemon-select');
const pokemonSearchInput = document.getElementById('pokemon-search');
const pokemonImagePreview = document.getElementById('pokemon-image-preview');

// LocalStorage key
const STORAGE_KEY = 'pokemon_card_collection';

// PokéAPI URL
const POKE_API_URL = 'https://pokeapi.co/api/v2';

// State variables
let cards = [];
let sets = new Set();
let pokemonList = [];
let selectedPokemon = null;

// Generate a simple UUID for card IDs
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Load cards from localStorage
function loadCards() {
    try {
        const storedCards = localStorage.getItem(STORAGE_KEY);
        if (storedCards) {
            cards = JSON.parse(storedCards);
            
            // Extract unique sets for the filter dropdown
            sets = new Set(cards.map(card => card.set));
            populateSetFilter();
        }
        
        renderCards();
    } catch (error) {
        console.error('Error loading cards from localStorage:', error);
        alert('Failed to load your card collection.');
    }
}

// Save cards to localStorage
function saveCards() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (error) {
        console.error('Error saving cards to localStorage:', error);
        alert('Failed to save your card collection.');
    }
}

// Fetch Pokemon list from PokéAPI
async function fetchPokemonList() {
    try {
        // Fetch first 151 Pokemon (can be adjusted to fetch more)
        const response = await fetch(`${POKE_API_URL}/pokemon?limit=151`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        pokemonList = data.results;
        
        // Initially populate select with first 20 Pokemon
        updatePokemonSelect(pokemonList.slice(0, 20));
        
    } catch (error) {
        console.error('Error fetching Pokemon list:', error);
        alert('Failed to load Pokemon list. Please try again later.');
    }
}

// Update the Pokemon select dropdown
function updatePokemonSelect(pokemonToShow) {
    pokemonSelect.innerHTML = '<option value="">Select a Pokémon</option>';
    
    pokemonToShow.forEach(pokemon => {
        const option = document.createElement('option');
        option.value = pokemon.name;
        // Capitalize the first letter
        option.textContent = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        pokemonSelect.appendChild(option);
    });
}

// Preload image to avoid flickering
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = url;
    });
}

// Set image with preloading and fallback
async function setImageWithFallback(imgElement, imageUrl, fallbackUrl) {
    // Show current image until new one is loaded
    try {
        await preloadImage(imageUrl);
        imgElement.src = imageUrl;
    } catch (error) {
        console.error('Image loading failed, using fallback:', error);
        imgElement.src = fallbackUrl;
    }
}

// Fetch Pokemon details
async function fetchPokemonDetails(pokemonName) {
    try {
        // Show loading state
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading';
        pokemonImagePreview.parentNode.appendChild(loadingSpinner);
        
        const response = await fetch(`${POKE_API_URL}/pokemon/${pokemonName.toLowerCase()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove loading spinner
        if (loadingSpinner.parentNode) {
            loadingSpinner.parentNode.removeChild(loadingSpinner);
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching details for ${pokemonName}:`, error);
        
        // Remove loading spinner on error
        const loadingSpinner = document.querySelector('.loading');
        if (loadingSpinner && loadingSpinner.parentNode) {
            loadingSpinner.parentNode.removeChild(loadingSpinner);
        }
        
        return null;
    }
}

// Add a new card
function addCard(cardData) {
    try {
        // Create a card object with ID
        const newCard = {
            _id: generateUUID(),
            ...cardData,
            createdAt: new Date().toISOString()
        };
        
        // Add to local cards array
        cards.push(newCard);
        
        // Save to localStorage
        saveCards();
        
        // Add new set to the filter if it doesn't exist yet
        if (!sets.has(newCard.set)) {
            sets.add(newCard.set);
            populateSetFilter();
        }
        
        renderCards();
        cardForm.reset();
        
        // Clear the selected Pokemon
        selectedPokemon = null;
        setImageWithFallback(pokemonImagePreview, 'images/card-placeholder.png', 'images/card-placeholder.png');
        
        alert('Card added successfully!');
    } catch (error) {
        console.error('Error adding card:', error);
        alert(`Failed to add card: ${error.message}`);
    }
}

// Delete a card
function deleteCard(cardId) {
    if (!confirm('Are you sure you want to delete this card?')) {
        return;
    }
    
    try {
        // Remove card from the local array
        cards = cards.filter(card => card._id !== cardId);
        
        // Save to localStorage
        saveCards();
        
        // Recalculate sets
        sets = new Set(cards.map(card => card.set));
        populateSetFilter();
        
        renderCards();
        closeModal();
        alert('Card deleted successfully!');
    } catch (error) {
        console.error('Error deleting card:', error);
        alert(`Failed to delete card: ${error.message}`);
    }
}

// Update a card
function updateCard(cardId, updatedData) {
    try {
        // Find the card index
        const index = cards.findIndex(card => card._id === cardId);
        
        if (index === -1) {
            throw new Error('Card not found');
        }
        
        // Update the card
        const updatedCard = {
            ...cards[index],
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
        
        // Replace the old card
        cards[index] = updatedCard;
        
        // Save to localStorage
        saveCards();
        
        // Recalculate sets
        sets = new Set(cards.map(card => card.set));
        populateSetFilter();
        
        renderCards();
        closeModal();
        alert('Card updated successfully!');
    } catch (error) {
        console.error('Error updating card:', error);
        alert(`Failed to update card: ${error.message}`);
    }
}

// Render cards to the DOM
function renderCards() {
    // Filter cards based on search and filter options
    const searchTerm = searchInput.value.toLowerCase();
    const rarityValue = rarityFilter.value;
    const setValue = setFilter.value;
    
    const filteredCards = cards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(searchTerm);
        const matchesRarity = !rarityValue || card.rarity === rarityValue;
        const matchesSet = !setValue || card.set === setValue;
        
        return matchesSearch && matchesRarity && matchesSet;
    });
    
    // Clear the card list
    cardList.innerHTML = '';
    
    if (filteredCards.length === 0) {
        cardList.innerHTML = '<p class="no-results">No cards found. Try adjusting your filters.</p>';
        return;
    }
    
    // Create card elements
    filteredCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.id = card._id;
        
        const rarityClass = card.rarity.toLowerCase().replace(' ', '-');
        
        // Create image element with proper error handling
        const imgElement = document.createElement('img');
        imgElement.alt = card.name;
        imgElement.onerror = function() {
            this.src = 'images/card-placeholder.png';
        };
        
        // Set the image source
        if (card.image) {
            imgElement.src = card.image;
        } else {
            imgElement.src = 'images/card-placeholder.png';
        }
        
        // Create card info div
        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';
        cardInfo.innerHTML = `
            <h3>${card.name}</h3>
            <p>${card.set} - ${card.number}</p>
            <p>Condition: ${card.condition}</p>
            <span class="card-rarity ${rarityClass}">${card.rarity}</span>
        `;
        
        // Append elements
        cardElement.appendChild(imgElement);
        cardElement.appendChild(cardInfo);
        
        // Add click event
        cardElement.addEventListener('click', () => showCardDetails(card));
        
        // Add to card list
        cardList.appendChild(cardElement);
    });
}

// Show card details in the modal
function showCardDetails(card) {
    const purchaseDate = card.purchaseDate ? new Date(card.purchaseDate).toLocaleDateString() : 'N/A';
    const purchasePrice = card.purchasePrice ? `$${parseFloat(card.purchasePrice).toFixed(2)}` : 'N/A';
    
    cardDetails.innerHTML = '';
    
    // Create elements instead of using innerHTML for better control
    const headerDiv = document.createElement('div');
    headerDiv.className = 'detail-header';
    
    const detailImage = document.createElement('img');
    detailImage.className = 'detail-image';
    detailImage.alt = card.name;
    detailImage.onerror = function() {
        this.src = 'images/card-placeholder.png';
    };
    
    // Set the image with proper path
    if (card.image) {
        detailImage.src = card.image;
    } else {
        detailImage.src = 'images/card-placeholder.png';
    }
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'detail-info';
    infoDiv.innerHTML = `
        <h2>${card.name}</h2>
        <p><strong>Set:</strong> ${card.set}</p>
        <p><strong>Card Number:</strong> ${card.number}</p>
        <p><strong>Rarity:</strong> ${card.rarity}</p>
        <p><strong>Condition:</strong> ${card.condition}</p>
        <p><strong>Purchase Date:</strong> ${purchaseDate}</p>
        <p><strong>Purchase Price:</strong> ${purchasePrice}</p>
    `;
    
    headerDiv.appendChild(detailImage);
    headerDiv.appendChild(infoDiv);
    
    const notesDiv = document.createElement('div');
    notesDiv.className = 'detail-notes';
    notesDiv.innerHTML = `
        <h3>Notes:</h3>
        <p>${card.notes || 'No notes added'}</p>
    `;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'detail-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.dataset.id = card._id;
    editBtn.textContent = 'Edit Card';
    editBtn.addEventListener('click', () => {
        showEditForm(card);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.dataset.id = card._id;
    deleteBtn.textContent = 'Delete Card';
    deleteBtn.addEventListener('click', () => {
        deleteCard(card._id);
    });
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    // Append all sections to cardDetails
    cardDetails.appendChild(headerDiv);
    cardDetails.appendChild(notesDiv);
    cardDetails.appendChild(actionsDiv);
    
    // Show the modal
    cardModal.style.display = 'block';
}

// Show edit form in the modal
function showEditForm(card) {
    cardDetails.innerHTML = `
        <h2>Edit Card</h2>
        <form id="edit-card-form">
            <div class="form-group">
                <label for="edit-name">Pokémon Name:</label>
                <input type="text" id="edit-name" value="${card.name}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-set">Card Set:</label>
                <input type="text" id="edit-set" value="${card.set}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-number">Card Number:</label>
                <input type="text" id="edit-number" value="${card.number}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-rarity">Rarity:</label>
                <select id="edit-rarity" required>
                    <option value="Common" ${card.rarity === 'Common' ? 'selected' : ''}>Common</option>
                    <option value="Uncommon" ${card.rarity === 'Uncommon' ? 'selected' : ''}>Uncommon</option>
                    <option value="Rare" ${card.rarity === 'Rare' ? 'selected' : ''}>Rare</option>
                    <option value="Rare Holo" ${card.rarity === 'Rare Holo' ? 'selected' : ''}>Rare Holo</option>
                    <option value="Ultra Rare" ${card.rarity === 'Ultra Rare' ? 'selected' : ''}>Ultra Rare</option>
                    <option value="Secret Rare" ${card.rarity === 'Secret Rare' ? 'selected' : ''}>Secret Rare</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="edit-condition">Condition:</label>
                <select id="edit-condition" required>
                    <option value="Mint" ${card.condition === 'Mint' ? 'selected' : ''}>Mint</option>
                    <option value="Near Mint" ${card.condition === 'Near Mint' ? 'selected' : ''}>Near Mint</option>
                    <option value="Excellent" ${card.condition === 'Excellent' ? 'selected' : ''}>Excellent</option>
                    <option value="Good" ${card.condition === 'Good' ? 'selected' : ''}>Good</option>
                    <option value="Poor" ${card.condition === 'Poor' ? 'selected' : ''}>Poor</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="edit-image">Image URL:</label>
                <input type="url" id="edit-image" value="${card.image || ''}">
            </div>
            
            <div class="form-group">
                <label for="edit-purchaseDate">Purchase Date:</label>
                <input type="date" id="edit-purchaseDate" value="${card.purchaseDate ? card.purchaseDate.substring(0, 10) : ''}">
            </div>
            
            <div class="form-group">
                <label for="edit-purchasePrice">Purchase Price ($):</label>
                <input type="number" step="0.01" id="edit-purchasePrice" value="${card.purchasePrice || ''}">
            </div>
            
            <div class="form-group">
                <label for="edit-notes">Notes:</label>
                <textarea id="edit-notes">${card.notes || ''}</textarea>
            </div>
            
            <div class="detail-actions">
                <button type="submit" class="btn-edit">Save Changes</button>
                <button type="button" class="btn-cancel">Cancel</button>
            </div>
        </form>
    `;
    
    // Add event listeners for the form
    const editForm = document.getElementById('edit-card-form');
    const cancelBtn = cardDetails.querySelector('.btn-cancel');
    
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const updatedData = {
            name: document.getElementById('edit-name').value,
            set: document.getElementById('edit-set').value,
            number: document.getElementById('edit-number').value,
            rarity: document.getElementById('edit-rarity').value,
            condition: document.getElementById('edit-condition').value,
            image: document.getElementById('edit-image').value || null,
            purchaseDate: document.getElementById('edit-purchaseDate').value || null,
            purchasePrice: document.getElementById('edit-purchasePrice').value || null,
            notes: document.getElementById('edit-notes').value || null
        };
        
        updateCard(card._id, updatedData);
    });
    
    cancelBtn.addEventListener('click', () => {
        showCardDetails(card);
    });
}

// Handle Pokemon select change
async function handlePokemonSelect(e) {
    const pokemonName = e.target.value;
    
    if (!pokemonName) {
        selectedPokemon = null;
        setImageWithFallback(pokemonImagePreview, 'images/card-placeholder.png', 'images/card-placeholder.png');
        document.getElementById('name').value = '';
        return;
    }
    
    // Show loading spinner next to the image
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading';
    pokemonImagePreview.parentNode.appendChild(loadingSpinner);
    
    // Fetch Pokemon details
    const pokemonDetails = await fetchPokemonDetails(pokemonName);
    
    // Remove loading spinner
    if (loadingSpinner.parentNode) {
        loadingSpinner.parentNode.removeChild(loadingSpinner);
    }
    
    if (pokemonDetails) {
        selectedPokemon = pokemonDetails;
        
        // Update preview image with official artwork
        const imageUrl = pokemonDetails.sprites.other['official-artwork'].front_default || 
                         pokemonDetails.sprites.front_default;
        
        // Use preloading to avoid flickering
        await setImageWithFallback(pokemonImagePreview, imageUrl, 'images/card-placeholder.png');
        
        // Update name field (capitalize first letter)
        const pokemonNameCapitalized = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
        document.getElementById('name').value = pokemonNameCapitalized;
    } else {
        // Reset if error
        setImageWithFallback(pokemonImagePreview, 'images/card-placeholder.png', 'images/card-placeholder.png');
        selectedPokemon = null;
    }
}

// Handle Pokemon search
function handlePokemonSearch() {
    const searchTerm = pokemonSearchInput.value.toLowerCase();
    
    if (!searchTerm) {
        // If search is empty, show first 20 pokemon
        updatePokemonSelect(pokemonList.slice(0, 20));
        return;
    }
    
    // Filter pokemon by name
    const filteredPokemon = pokemonList.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm)
    );
    
    // Update select with filtered pokemon
    updatePokemonSelect(filteredPokemon.slice(0, 20)); // Limit to first 20 matching results
}

// Close the modal
function closeModal() {
    cardModal.style.display = 'none';
}

// Populate the set filter dropdown
function populateSetFilter() {
    setFilter.innerHTML = '<option value="">All Sets</option>';
    
    Array.from(sets).sort().forEach(set => {
        const option = document.createElement('option');
        option.value = set;
        option.textContent = set;
        setFilter.appendChild(option);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Fix image paths
    const basePath = window.location.pathname.endsWith('/') 
        ? window.location.pathname 
        : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    
    // Set initial placeholder image with proper path
    if (pokemonImagePreview) {
        pokemonImagePreview.src = 'images/card-placeholder.png';
        pokemonImagePreview.onerror = function() {
            console.warn('Failed to load placeholder image, using data URI');
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjMzNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMjQwIiBoZWlnaHQ9IjMzNiIgcng9IjEyIiBmaWxsPSIjZjBmMGYwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEyMCIgY3k9IjEyMCIgcj0iODAiIGZpbGw9IiNmMGYwZjAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTEyMCw0MCBhODAsODAgMCAwLDEgMCwxNjAgYTgwLDgwIDAgMCwxIDAsLTE2MCIgZmlsbD0iI2Y4NGM0YyIvPjxwYXRoIGQ9Ik0xMjAsMTIwIGgtODAgYTgwLDgwIDAgMCwwIDgwLDgwIGE4MCw4MCAwIDAsMCA4MCwtODAgaC04MCIgZmlsbD0iI2YwZjBmMCIvPjxjaXJjbGUgY3g9IjEyMCIgY3k9IjEyMCIgcj0iMjAiIGZpbGw9IiNmMGYwZjAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSI0Ii8+PGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiByPSIxMiIgZmlsbD0iI2QwZDBkMCIvPjwvc3ZnPg==';
        };
    }
    
    // Load cards from localStorage
    loadCards();
    
    // Fetch Pokémon list from PokéAPI
    fetchPokemonList();
    
    // Form submission
    cardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const cardData = {
            name: document.getElementById('name').value,
            set: document.getElementById('set').value,
            number: document.getElementById('number').value,
            rarity: document.getElementById('rarity').value,
            condition: document.getElementById('condition').value,
            // Use selected Pokemon image if available, otherwise use input URL
            image: selectedPokemon ? 
                  (selectedPokemon.sprites.other['official-artwork'].front_default || 
                   selectedPokemon.sprites.front_default) : 
                  document.getElementById('image').value || null,
            purchaseDate: document.getElementById('purchaseDate').value || null,
            purchasePrice: document.getElementById('purchasePrice').value || null,
            notes: document.getElementById('notes').value || null
        };
        
        addCard(cardData);
    });
    
    // Pokemon select
    if (pokemonSelect) {
        pokemonSelect.addEventListener('change', handlePokemonSelect);
    }
    
    // Pokemon search
    if (pokemonSearchInput) {
        pokemonSearchInput.addEventListener('input', handlePokemonSearch);
    }
    
    // Search and filter
    searchInput.addEventListener('input', renderCards);
    rarityFilter.addEventListener('change', renderCards);
    setFilter.addEventListener('change', renderCards);
    
    // Clear filters
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        rarityFilter.value = '';
        setFilter.value = '';
        renderCards();
    });
    
    // Close modal
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === cardModal) {
            closeModal();
        }
    });
});

// Add this to your app.js file to create an embedded placeholder SVG
// This ensures the placeholder is always available even if the image file is missing

const PLACEHOLDER_SVG = `
<svg width="240" height="336" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="240" height="336" rx="12" fill="#f0f0f0" stroke="#d0d0d0" stroke-width="2"/>
  <circle cx="120" cy="120" r="80" fill="#f0f0f0" stroke="#d0d0d0" stroke-width="2"/>
  <path d="M120,40 a80,80 0 0,1 0,160 a80,80 0 0,1 0,-160" fill="#f84c4c"/>
  <path d="M120,120 h-80 a80,80 0 0,0 80,80 a80,80 0 0,0 80,-80 h-80" fill="#f0f0f0"/>
  <circle cx="120" cy="120" r="20" fill="#f0f0f0" stroke="#d0d0d0" stroke-width="4"/>
  <circle cx="120" cy="120" r="12" fill="#d0d0d0"/>
  <rect x="40" y="220" width="160" height="20" rx="4" fill="#d0d0d0"/>
  <rect x="60" y="250" width="120" height="16" rx="4" fill="#d0d0d0"/>
  <rect x="80" y="276" width="80" height="16" rx="4" fill="#d0d0d0"/>
  <rect x="90" y="302" width="60" height="16" rx="4" fill="#d0d0d0"/>
</svg>
`;

// Convert the SVG to a data URI that can be used as an image source
const PLACEHOLDER_SVG_URI = 'data:image/svg+xml;base64,' + btoa(PLACEHOLDER_SVG);

// Function to set the fallback image
function setPlaceholderImage(imgElement) {
  imgElement.src = PLACEHOLDER_SVG_URI;
}

// Use this function to add a fallback to any image that fails to load
function addImageFallback() {
  // Add error event handler to all images
  document.querySelectorAll('img').forEach(img => {
    img.onerror = function() {
      setPlaceholderImage(this);
    };
  });
  
  // Specifically handle the pokemon preview image
  const pokemonPreview = document.getElementById('pokemon-image-preview');
  if (pokemonPreview) {
    if (!pokemonPreview.src || pokemonPreview.src === 'images/card-placeholder.png') {
      setPlaceholderImage(pokemonPreview);
    }
    pokemonPreview.onerror = function() {
      setPlaceholderImage(this);
    };
  }
}

// Call this function once when the DOM is loaded
document.addEventListener('DOMContentLoaded', addImageFallback);

// Loading spinner SVG as data URI
const LOADING_SVG_URI = 'data:image/svg+xml;base64,' + btoa(`
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="35" fill="none" stroke="#f84c4c" stroke-width="10" stroke-dasharray="164.93361431346415 56.97787143782138">
    <animateTransform 
      attributeName="transform" 
      type="rotate" 
      repeatCount="indefinite" 
      dur="1s" 
      values="0 50 50;360 50 50" 
      keyTimes="0;1">
    </animateTransform>
  </circle>
</svg>
`);

// Function to create a loading spinner
function createLoadingSpinner() {
  const loadingImg = document.createElement('img');
  loadingImg.src = LOADING_SVG_URI;
  loadingImg.alt = "Loading...";
  loadingImg.className = "loading-spinner";
  loadingImg.style.width = "40px";
  loadingImg.style.height = "40px";
  return loadingImg;
}

// Usage example:
// const spinner = createLoadingSpinner();
// someElement.appendChild(spinner);
// When done loading:
// spinner.remove();