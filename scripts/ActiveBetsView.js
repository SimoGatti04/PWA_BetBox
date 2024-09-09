import { siteImages } from './siteImages.js';
import config from '../config.js';
import { getMatchResult } from './matchResultsService.js';

const BET_UPDATED_EVENT = 'betUpdated';

export function createActiveBetsView() {
    const view = document.createElement('div');
    view.className = 'active-bets-view';
    const header = createHeader();
    const betList = createBetList();
    view.appendChild(header);
    view.appendChild(betList);

    // Load and render saved bets immediately
    const savedBets = loadBetsFromLocalStorage();
    if (Object.keys(savedBets).length > 0) {
        renderBetList(savedBets, betList);
    }

    updateMatchResultsIfNeeded(savedBets, betList);

    return view;
}


function updateMatchResultsIfNeeded(bets, betList) {
    const now = Date.now();
    const lastRequestTime = localStorage.getItem('lastResultRequestTime') || 0;
    const fiveMinutes = 5 * 60 * 1000;

    const eventsToUpdate = Object.values(bets).flatMap(siteBets =>
    siteBets.flatMap(bet => bet.events.filter(event => {
        if (!event.matchResult || ['NOT STARTED', 'TIMED'].includes(event.matchResult.status.toUpperCase())) {
            return now >= new Date(event.date).getTime();
        }
        if (['IN_PLAY', 'LIVE'].includes(event.matchResult.status.toUpperCase())) {
            return now - lastRequestTime >= fiveMinutes;
        }
        return false; // Don't update finished matches
    }))
);

    if (eventsToUpdate.length > 0) {
        updateMatchResults(eventsToUpdate, bets, betList);
    }
}

async function updateMatchResults(events, bets, betList) {
    const updatedResults = await getMatchResult(events);

    for (const site in bets) {
        for (const bet of bets[site]) {
            bet.events = bet.events.map(event => {
                const updatedResult = updatedResults.find(r => r.name === event.name);
                return updatedResult ? { ...event, matchResult: updatedResult } : event;
            });
        }
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
    header.appendChild(fetchButton);
    header.appendChild(refreshButton);
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
async function loadActiveBets(container) {
    try {
        const savedBets = loadBetsFromLocalStorage();
        if (Object.keys(savedBets).length > 0) {
            renderBetList(savedBets, container);
        }
        let bets;
        // Fetch from server in production
        const response = await fetch(`${config.apiBaseUrl}/bets/all-active-bets`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });
        bets = await response.json();
        saveBetsToLocalStorage(bets);
        renderBetList(bets, container);
    } catch (error) {
        console.error('Errore nel caricamento delle scommesse attive:', error);
        const savedBets = loadBetsFromLocalStorage();
        renderBetList(savedBets, container);
    }
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

    function updateDetailView(updatedBets) {
        const updatedBet = Object.values(updatedBets)
            .flatMap(siteBets => siteBets)
            .find(b => b.betId === bet.betId);

        if (updatedBet) {
            detailView.innerHTML = createBetDetailContent(updatedBet);
            attachCloseButtonListener(detailView);
        }
    }

    detailView.innerHTML = createBetDetailContent(bet);
    attachCloseButtonListener(detailView);

    window.addEventListener(BET_UPDATED_EVENT, (event) => updateDetailView(event.detail));

    document.body.appendChild(detailView);
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

function attachCloseButtonListener(detailView) {
    const closeButton = detailView.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(detailView);
        window.removeEventListener(BET_UPDATED_EVENT, updateDetailView);
    });
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
        const response = await fetch(`${config.apiBaseUrl}/bets/all-active-bets`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });
        const bets = await response.json();
        const betList = document.querySelector('.bet-list');
        renderBetList(bets, betList);
        saveBetsToLocalStorage(bets);
    } catch (error) {
        console.error('Errore nel refresh delle scommesse:', error);
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
