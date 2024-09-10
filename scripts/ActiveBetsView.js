import { siteImages } from './siteImages.js';
import config from '../config.js';
import { getMatchResult } from './matchResultsService.js';

const BET_UPDATED_EVENT = 'betUpdated';

export function createActiveBetsView() {
    const view = document.createElement('div');
    view.className = 'active-bets-view';
    const header = createHeader();
    const betList = createBetList();
    const historyButton = createHistoryButton();
    const menu = createMenu();
    view.appendChild(header);
    view.appendChild(menu);
    view.appendChild(betList);
    view.appendChild(historyButton);

    // Load and render saved bets immediately
    const savedBets = loadBetsFromLocalStorage();
    if (Object.keys(savedBets).length > 0) {
        renderBetList(savedBets, betList);
    }

    updateMatchResultsIfNeeded(savedBets, betList);

    return view;
}

function createHistoryButton() {
    const historyButton = document.createElement('button');
    historyButton.className = 'bet-history-button';
    historyButton.innerHTML = '<i class="fas fa-clipboard-list"></i>';
    historyButton.addEventListener('click', showBetHistory);
    return historyButton;
}


function updateMatchResultsIfNeeded(bets, betList) {
    const now = Date.now();
    const lastRequestTime = localStorage.getItem('lastResultRequestTime') || 0;
    const fiveMinutes = 5 * 60 * 1000;

    const eventsToUpdate = Object.values(bets).flatMap(site =>
        Object.values(site).flatMap(bet =>
            bet && bet.events ? bet.events.filter(event => {
                if (!event.matchResult || ['NOT STARTED', 'TIMED'].includes(event.matchResult?.status?.toUpperCase())) {
                    return now >= new Date(event.date).getTime();
                }
                if (['IN_PLAY', 'LIVE'].includes(event.matchResult?.status?.toUpperCase())) {
                    return now - lastRequestTime >= fiveMinutes;
                }
                return false; // Don't update finished matches
            }) : []
        )
    );

    if (eventsToUpdate.length > 0) {
        updateMatchResults(eventsToUpdate, bets, betList);
    }
}

function showBetHistory() {
    const savedBets = loadBetsFromLocalStorage();
    const historyModal = createBetHistoryModal(savedBets.history);
    document.body.appendChild(historyModal);
}

function createBetHistoryModal(history) {
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const closeButton = document.createElement('span');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => modalContainer.remove());
    modalContent.appendChild(closeButton);

    const title = document.createElement('h2');
    title.textContent = 'Cronologia scommesse';
    modalContent.appendChild(title);

    const historyList = document.createElement('ul');
    historyList.className = 'history-list';

    for (const site in history) {
        history[site].forEach(bet => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>${site}</strong>: ${bet.importoGiocato}@${bet.quotaTotale} - 
                ${formatDate(bet.removedAt)}
            `;
            historyList.appendChild(listItem);
        });
    }

    modalContent.appendChild(historyList);
    modalContainer.appendChild(modalContent);

    return modalContainer;
}

async function updateMatchResults(events, bets, betList) {
    const updatedResults = await getMatchResult(events);

    for (const site in bets) {
        ['toKeep', 'toAdd'].forEach(key => {
            if (Array.isArray(bets[site][key])) {
                bets[site][key] = bets[site][key].map(bet => ({
                    ...bet,
                    events: bet.events.map(event => {
                        const updatedResult = updatedResults.find(r => r.name === event.name);
                        return updatedResult ? { ...event, matchResult: updatedResult } : event;
                    })
                }));
            }
        });
    }

    localStorage.setItem('lastResultRequestTime', Date.now().toString());
    saveBetsToLocalStorage(bets);
    renderBetList(bets, betList);
    window.dispatchEvent(new CustomEvent(BET_UPDATED_EVENT, { detail: bets }));
}



function createHeader() {
    const header = document.createElement('div');
    header.className = 'active-bets-header';
    const fetchButton = createButton('fetch-bets-button', 'fa-play', fetchActiveBets);
    const refreshButton = createButton('refresh-bets-button', 'fa-sync-alt', refreshAllBets);
    const menuButton = createButton('menu-button', 'fa-ellipsis-v', toggleMenu);
    header.appendChild(fetchButton);
    header.appendChild(refreshButton);
    header.appendChild(menuButton);
    return header;
}

function createButton(id, iconClass, onClick) {
    const button = document.createElement('button');
    button.id = id;
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass}`;
    button.appendChild(icon);
    button.addEventListener('click', onClick);
    return button;
}
function createBetList() {
    const betList = document.createElement('div');
    betList.className = 'bet-list';
    return betList;
}
function createMenu() {
    const sites = ['goldbet', 'bet365', 'eurobet', 'sisal', 'snai', 'lottomatica', 'cplay'];
    const menu = document.createElement('div');
    menu.className = 'update-menu overlay';
    menu.style.display = 'none';

    sites.forEach(site => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.textContent = `Update ${site.charAt(0).toUpperCase() + site.slice(1)}`;
        item.addEventListener('click', () => {
            updateSiteBets(site);
            toggleMenu();
        });
        menu.appendChild(item);
    });

    return menu;
}

function toggleMenu() {
    const menu = document.querySelector('.update-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}


async function loadActiveBets(container) {
    try {
        const savedBets = loadBetsFromLocalStorage();
        const response = await fetch(`${config.apiBaseUrl}/bets/all-active-bets`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify({ appBets: savedBets })
        });
        const comparison = await response.json();
        const updatedBets = mergeServerAndLocalBets(savedBets, comparison);
        renderBetList(updatedBets, container);
        saveBetsToLocalStorage(updatedBets);
        updateMatchResultsIfNeeded(updatedBets, container);
    } catch (error) {
        console.error('Errore nel caricamento delle scommesse attive:', error);
        const savedBets = loadBetsFromLocalStorage();
        renderBetList(savedBets, container);
    }
}

function mergeServerAndLocalBets(savedBets, comparison) {
    const updatedBets = { ...savedBets };
    for (const site in comparison) {
        updatedBets[site] = updatedBets[site] || {};
        updatedBets[site].toKeep = comparison[site].toKeep.map(betId => {
            return savedBets[site]?.toKeep?.find(bet => bet.betId === betId) || betId;
        });
        updatedBets[site].toAdd = comparison[site].toAdd;
        // Rimuovi le scommesse in toRemove
        if (updatedBets[site].toKeep) {
            updatedBets[site].toKeep = updatedBets[site].toKeep.filter(bet =>
                !comparison[site].toRemove.includes(bet.betId)
            );
        }
    }
    return updatedBets;
}

function processComparisonResult(comparison, savedBets) {
    const updatedBets = { active: {}, history: savedBets.history || {} };
    const now = Date.now();

    for (const site in comparison) {
        updatedBets.active[site] = [];

        // Add new bets
        updatedBets.active[site].push(...comparison[site].toAdd);

        // Keep existing bets
        comparison[site].toKeep.forEach(betId => {
            const existingBet = savedBets.active[site].find(bet => bet.betId === betId);
            if (existingBet) {
                updatedBets.active[site].push(existingBet);
            }
        });

        // Move removed bets to history
        comparison[site].toRemove.forEach(betId => {
            const removedBet = savedBets.active[site].find(bet => bet.betId === betId);
            if (removedBet) {
                if (!updatedBets.history[site]) {
                    updatedBets.history[site] = [];
                }
                updatedBets.history[site].push({ ...removedBet, removedAt: now });
            }
        });
    }

    // Clean up old history entries
    for (const site in updatedBets.history) {
        updatedBets.history[site] = updatedBets.history[site].filter(bet =>
            now - bet.removedAt < 7 * 24 * 60 * 60 * 1000
        );
    }

    return updatedBets;
}

function renderBetList(bets, container) {
    container.innerHTML = '';
    let hasBets = false;

    Object.entries(bets).forEach(([site, siteBets]) => {
        if (siteBets.length > 0) {
            hasBets = true;
            siteBets.forEach(bet => {
                const betPreview = createBetPreview(site, bet);
                container.appendChild(betPreview);
            });
        }
    });

    if (!hasBets) {
        showNoBetsMessage(container);
    }
}


function createBetPreview(site, bet) {
    const preview = document.createElement('div');
    preview.className = 'bet-preview';
    preview.style.backgroundColor = getStatusColor(bet.esitoTotale);
    preview.innerHTML = `
        <img src="${siteImages[site.toLowerCase()]}" alt="${site} logo" class="site-logo">
        <div class="bet-info">
            <p class="potential-win">${bet.vincitaPotenziale}</p>
            <p class="bet-amount">${bet.importoGiocato}@${bet.quotaTotale}</p>
        </div>
    `;
    preview.addEventListener('click', () => showBetDetails(bet));
    return preview;
}

function showBetDetails(bet) {
    const detailView = document.createElement('div');
    detailView.className = 'bet-detail-view';

    const updateDetailView = (event) => {
        const updatedBets = event.detail;
        const updatedBet = Object.values(updatedBets)
            .flat()
            .find(b => b.betId === bet.betId);

        if (updatedBet) {
            detailView.innerHTML = createBetDetailContent(updatedBet);
            attachCloseButtonListener(detailView, updateDetailView);
        }
    };

    detailView.innerHTML = createBetDetailContent(bet);
    attachCloseButtonListener(detailView, updateDetailView);

    window.addEventListener(BET_UPDATED_EVENT, updateDetailView);

    document.body.appendChild(detailView);
}

function attachCloseButtonListener(detailView, updateDetailView) {
    const closeButton = detailView.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(detailView);
        window.removeEventListener(BET_UPDATED_EVENT, updateDetailView);
    });
}


function createBetDetailContent(bet) {
    const eventListItems = bet.events.map(event => {
        const matchResult = event.matchResult || {};
        let isLive = ['IN_PLAY', 'LIVE'].some(status =>
            matchResult.status && matchResult.status.toUpperCase() === status
        );
        let isNotStarted = ['NOT STARTED', 'TIMED'].some(status =>
            matchResult.status && matchResult.status.toUpperCase() === status
        );
        let resultClass = isLive ? 'result in-play' : (isNotStarted ? 'result not-started' : 'result');

        let resultString = isNotStarted ? '0-0' : (matchResult.score || '');

        return `
            <li class="event-item">
                <div class="event-details">
                    <p class="event-name"><strong>${event.name}</strong></p>
                    <p class="event-date">${formatDate(event.date)}</p>
                    <p>${event.marketType}: ${event.selection}</p>
                    <div class="event-odds" style="color: ${getStatusColorSolid(event.result)}">${event.odds}</div>
                    <div class="${resultClass}">${resultString}</div>
                </div>
            </li>
        `;
    });

    return `
        <div class="bet-detail-header">
            <h2>Dettagli Scommessa</h2>
            <button class="close-button">×</button>
        </div>
        <div class="bet-detail-content">
            <div class="bet-summary">
                <span class="bet-stake-odds">${bet.importoGiocato}@${bet.quotaTotale}</span>
                <span class="bet-potential-win" style="color: ${getStatusColorSolid(bet.esitoTotale)}">
                    ${bet.vincitaPotenziale}
                </span>
            </div>
            <h3>Eventi:</h3>
            <ul class="event-list">
                ${eventListItems.join('')}
            </ul>
        </div>
    `;
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'in corso':
            return 'rgba(128, 128, 0, 0.35)'; // Yellow with opacity
        case 'perdente':
        case 'perso':
            return 'rgba(128, 0, 0, 0.35)'; // Red with opacity
        case 'vincente':
        case 'vinto':
            return 'rgba(0, 128, 0, 0.35)'; // Green with opacity
        default:
            return 'rgba(128, 128, 128, 0.35)'; // Grey with opacity for unknown status
    }
}
function getStatusColorSolid(status) {
    switch (status.toLowerCase()) {
        case 'in corso':
            return 'rgb(150, 150, 0)'; // Solid Yellow
        case 'perdente':
        case 'perso':
            return 'rgb(150, 0, 0)'; // Solid Red
        case 'vincente':
        case 'vinto':
            return 'rgb(0, 150, 0)'; // Solid Green
        default:
            return 'rgb(150, 150, 150)'; // Solid Grey for unknown status
    }
}

async function fetchActiveBets() {
    try {
        const response = await fetch(`${config.apiBaseUrl}/bets/fetch-active-bets`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });
        const result = await response.json();
        console.log('Scommesse attive recuperate:', result);
        const betList = document.querySelector('.bet-list');
        loadActiveBets(betList);
    } catch (error) {
        console.error('Errore nel recupero delle scommesse attive:', error);
    }
}

async function refreshAllBets() {
    try {
        const savedBets = loadBetsFromLocalStorage();
        const response = await fetch(`${config.apiBaseUrl}/bets/all-active-bets`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify({ appBets: savedBets })
        });
        const comparison = await response.json();
        const updatedBets = updateLocalBets(savedBets, comparison);
        const betList = document.querySelector('.bet-list');
        renderBetList(updatedBets, betList);
        saveBetsToLocalStorage(updatedBets);
    } catch (error) {
        console.error('Errore nel refresh delle scommesse:', error);
    }
}

function updateLocalBets(savedBets, comparison) {
    const updatedBets = { ...savedBets };

    for (const site in comparison) {
        updatedBets[site] = updatedBets[site] || [];

        // Add new bets from toAdd
        updatedBets[site] = [
            ...updatedBets[site],
            ...comparison[site].toAdd
        ];

        // Keep only bets that are in toKeep or were just added
        updatedBets[site] = updatedBets[site].filter(bet =>
            comparison[site].toKeep.includes(bet.betId) ||
            comparison[site].toAdd.some(newBet => newBet.betId === bet.betId)
        );
    }

    return updatedBets;
}

function createUpdateMenu() {
    const sites = ['goldbet', 'bet365', 'eurobet', 'sisal', 'snai', 'lottomatica', 'cplay'];
    const menu = document.createElement('select');
    menu.id = 'update-menu';

    const defaultOption = document.createElement('option');
    defaultOption.text = 'Update Site';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    menu.appendChild(defaultOption);

    sites.forEach(site => {
        const option = document.createElement('option');
        option.value = site;
        option.text = `Update ${site.charAt(0).toUpperCase() + site.slice(1)}`;
        menu.appendChild(option);
    });

    menu.addEventListener('change', (event) => {
        const selectedSite = event.target.value;
        updateSiteBets(selectedSite);
        event.target.selectedIndex = 0;
    });

    return menu;
}

async function updateSiteBets(site) {
    try {
        const response = await fetch(`${config.apiBaseUrl}/bets/${site}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });
        const result = await response.json();
        console.log(`Active bets updated for ${site}:`, result);
        loadActiveBets(document.querySelector('.bet-list'));
    } catch (error) {
        console.error(`Error updating active bets for ${site}:`, error);
    }
}


function showNoBetsMessage(container) {
    const message = document.createElement('div');
    message.className = 'no-bets-message';
    message.textContent = 'Nessuna scommessa attiva';
    container.appendChild(message);
}
function saveBetsToLocalStorage(bets) {
    localStorage.setItem('activeBets', JSON.stringify(bets));
}

function loadBetsFromLocalStorage() {
    const savedBets = localStorage.getItem('activeBets');
    return savedBets ? JSON.parse(savedBets) : {};
}
function formatDate(timestamp) {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const savedBets = loadBetsFromLocalStorage();
        const betList = document.querySelector('.bet-list');
        updateMatchResultsIfNeeded(savedBets, betList);
    }
});
