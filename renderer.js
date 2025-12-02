const goBtn = document.getElementById('go');
const urlInput = document.getElementById('url');
const tabsContainer = document.getElementById('tabs');
const addTabBtn = document.getElementById('addTab');
const webviewContainer = document.getElementById('webview-container');

const reloadBtn = document.getElementById('reload');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const homeBtn = document.getElementById('home');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.querySelector('.close-modal');
const saveBtn = document.querySelector('.btn-save');
const searchEngineSelect = document.getElementById('search-engine');

let activeTabId = 1;
let searchEngine = 'duckduckgo';
let tabCount = 1;
const webviews = {};
const tabElements = {};

// Initialize first tab (elements already present in DOM)
const initialWebview = document.getElementById('browser');
webviews[1] = initialWebview;
tabElements[1] = document.querySelector('.tab[data-tab="1"]');

function setTabTitle(tabId, title) {
  const tab = tabElements[tabId];
  const titleSpan = tab.querySelector('.title');
  if (titleSpan) titleSpan.textContent = title || 'New Tab';
}

function setTabFavicon(tabId, url) {
  const tab = tabElements[tabId];
  const favicon = tab.querySelector('.favicon');
  if (!favicon) return;
  
  // Try to load favicon from the URL
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    // Try Google's favicon service
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    favicon.style.backgroundImage = `url('${faviconUrl}')`;
  } catch (e) {
    // Fallback to gray
    favicon.style.backgroundImage = 'none';
    favicon.style.background = '#888';
  }
}

// Create a new tab with a webview and wire up events
function createTab(url = null) {
  if (!url) url = getHomeURL();
  tabCount++;
  const newTabId = tabCount;

  // Create tab element
  const newTab = document.createElement('div');
  newTab.classList.add('tab');
  newTab.dataset.tab = newTabId;
  newTab.innerHTML = `<span class="favicon"></span><span class="title">New Tab</span><button class="close" data-close="${newTabId}">×</button>`;
  tabsContainer.insertBefore(newTab, addTabBtn);
  tabElements[newTabId] = newTab;
  
  // Wire up close button
  const closeBtn = newTab.querySelector('.close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(newTabId);
  });

  // Create webview
  const newWebview = document.createElement('webview');
  newWebview.setAttribute('src', url);
  newWebview.id = 'webview-' + newTabId;
  newWebview.style.display = 'none';
  newWebview.style.flex = '1 1 auto';
  newWebview.style.width = '100%';
  webviews[newTabId] = newWebview;
  webviewContainer.appendChild(newWebview);

  // Event: update title & URL after navigation
  newWebview.addEventListener('did-finish-load', () => {
    setTabTitle(newTabId, newWebview.getTitle());
    if (parseInt(activeTabId) === newTabId) urlInput.value = newWebview.getURL();
    setTabFavicon(newTabId, newWebview.getURL());
  });
  newWebview.addEventListener('did-navigate', () => {
    setTabTitle(newTabId, newWebview.getTitle());
    if (parseInt(activeTabId) === newTabId) urlInput.value = newWebview.getURL();
    setTabFavicon(newTabId, newWebview.getURL());
  });
  newWebview.addEventListener('did-navigate-in-page', () => {
    if (parseInt(activeTabId) === newTabId) urlInput.value = newWebview.getURL();
    setTabFavicon(newTabId, newWebview.getURL());
  });

  // Handle popups/new-window by opening new tab
  newWebview.addEventListener('new-window', (e) => {
    createTab(e.url);
  });

  // Click tab
  newTab.addEventListener('click', () => switchTab(newTabId));

  switchTab(newTabId);
  return newTabId;
}

// Navigate input -> URL or search
function normalizeInputToURL(input) {
  if (!input) return '';
  input = input.trim();
  if (!input) return '';
  // treat as URL if contains a dot or starts with protocol
  if (input.startsWith('http://') || input.startsWith('https://') || input.includes('.')) {
    return input.startsWith('http') ? input : 'https://' + input;
  }
  return getSearchURL(input);
}

function getHomeURL() {
  const engineURLs = {
    'duckduckgo': 'https://duckduckgo.com',
    'google': 'https://google.com',
    'bing': 'https://bing.com',
    'brave': 'https://search.brave.com'
  };
  return engineURLs[searchEngine] || engineURLs['duckduckgo'];
}

function getSearchURL(query) {
  const engineURLs = {
    'duckduckgo': 'https://duckduckgo.com/?q=',
    'google': 'https://google.com/search?q=',
    'bing': 'https://bing.com/search?q=',
    'brave': 'https://search.brave.com/search?q='
  };
  const base = engineURLs[searchEngine] || engineURLs['duckduckgo'];
  return base + encodeURIComponent(query);
}

function navigateToURL(tabId) {
  const input = urlInput.value.trim();
  if (!input) return;
  const url = normalizeInputToURL(input);
  webviews[tabId].src = url;
}

goBtn.addEventListener('click', () => navigateToURL(activeTabId));
urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') navigateToURL(activeTabId); });

function switchTab(tabId) {
  if (!webviews[tabId]) return;
  activeTabId = tabId;
  for (const id in webviews) {
    webviews[id].style.display = parseInt(id) === tabId ? 'flex' : 'none';
  }
  for (const id in tabElements) {
    tabElements[id].classList.toggle('active', parseInt(id) === tabId);
  }
  // Update URL input and nav buttons for the new active tab
  try {
    const url = webviews[tabId].getURL();
    urlInput.value = url || '';
  } catch (err) {
    urlInput.value = '';
  }
  updateNavButtons(tabId);
}

function closeTab(tabId) {
  if (!webviews[tabId]) return;
  webviews[tabId].remove();
  tabElements[tabId].remove();
  delete webviews[tabId];
  delete tabElements[tabId];

  if (activeTabId === tabId) {
    const remainingIds = Object.keys(tabElements);
    if (remainingIds.length) {
      switchTab(parseInt(remainingIds[0]));
    } else {
      // If no tabs remain, open a fresh one
      const newId = createTab();
      switchTab(newId);
    }
  }
}

addTabBtn.addEventListener('click', () => createTab());

// Wire up initial tab events (existing elements)
tabElements[1].addEventListener('click', () => switchTab(1));

// Wire close button for initial tab
const initialCloseBtn = tabElements[1].querySelector('.close');
if (initialCloseBtn) {
  initialCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(1);
  });
}

initialWebview.addEventListener('did-finish-load', () => {
  setTabTitle(1, initialWebview.getTitle());
  urlInput.value = initialWebview.getURL();
  setTabFavicon(1, initialWebview.getURL());
});
initialWebview.addEventListener('did-navigate', () => {
  setTabTitle(1, initialWebview.getTitle());
  urlInput.value = initialWebview.getURL();
  setTabFavicon(1, initialWebview.getURL());
});
initialWebview.addEventListener('did-navigate-in-page', () => {
  urlInput.value = initialWebview.getURL();
  setTabFavicon(1, initialWebview.getURL());
});
initialWebview.addEventListener('new-window', (e) => {
  createTab(e.url);
});

// Navigation button handlers
backBtn.addEventListener('click', () => {
  try { webviews[activeTabId].goBack(); } catch (e) {}
  updateNavButtons(activeTabId);
});
forwardBtn.addEventListener('click', () => {
  try { webviews[activeTabId].goForward(); } catch (e) {}
  updateNavButtons(activeTabId);
});
homeBtn.addEventListener('click', () => {
  webviews[activeTabId].src = getHomeURL();
});

reloadBtn.addEventListener('click', () => { try { webviews[activeTabId].reload(); } catch (e) {} });

function updateNavButtons(tabId) {
  const w = webviews[tabId];
  if (!w) return;
  try {
    backBtn.disabled = !w.canGoBack();
    forwardBtn.disabled = !w.canGoForward();
  } catch (e) {
    backBtn.disabled = true;
    forwardBtn.disabled = true;
  }
}

// Settings modal handlers
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  searchEngineSelect.value = searchEngine;
});

closeModalBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

saveBtn.addEventListener('click', () => {
  searchEngine = searchEngineSelect.value;
  localStorage.setItem('searchEngine', searchEngine);
  settingsModal.classList.add('hidden');
  // Refresh current tab to load the new search engine's home page
  webviews[activeTabId].src = getHomeURL();
});

window.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add('hidden');
  }
});

// Load saved search engine on startup
const saved = localStorage.getItem('searchEngine');
if (saved) searchEngine = saved;

// Set initial webview URL to the home URL for the selected search engine
initialWebview.setAttribute('src', getHomeURL());

// Keyboard shortcuts: (none for closing tabs) — left intentionally empty
