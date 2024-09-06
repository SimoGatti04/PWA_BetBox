import { siteImages } from './siteImages.js';

async function loadLocalBetsData() {
    const response = await fetch('../../betboxscrapernodejs/activeBets/lottomaticaActiveBets.json');
    return await response.json();
}

export function createActiveBetsView() {
    const view = document.createElement('div');
    view.className = 'active-bets-view';

    const header = createHeader();
    const betList = createBetList();

    view.appendChild(header);
    view.appendChild(betList);

    loadActiveBets(betList);

    return view;
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
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Use local JSON file for testing
            const localData = await loadLocalBetsData();
            bets = { lottomatica: localData };
        } else {
            // Fetch from server in production
            const response = await fetch('https://legally-modest-joey.ngrok-free.app/bets/all-active-bets', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': '69420'
                }
            });
            bets = await response.json();
        }

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
    detailView.innerHTML = `
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
                ${bet.events.map(event => `
                    <li class="event-item">
                        <div class="event-details">
                            <p class="event-name"><strong>${event.name}</strong></p>
                            <p class="event-date">${formatDate(event.date)}</p>
                            <p>${event.marketType}: ${event.selection}</p>
                        </div>
                        <div class="event-odds" style="color: ${getStatusColorSolid(event.result)}">${event.odds}</div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    const closeButton = detailView.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(detailView);
    });

    document.body.appendChild(detailView);
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
            return 'rgb(128, 128, 0)'; // Solid Yellow
        case 'perdente':
        case 'perso':
            return 'rgb(128, 0, 0)'; // Solid Red
        case 'vincente':
        case 'vinto':
            return 'rgb(0, 128, 0)'; // Solid Green
        default:
            return 'rgb(128, 128, 128)'; // Solid Grey for unknown status
    }
}

async function fetchActiveBets() {
    try {
        const response = await fetch('https://legally-modest-joey.ngrok-free.app/bets/fetch-active-bets', {
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
        const response = await fetch('https://legally-modest-joey.ngrok-free.app/bets/all-active-bets', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });
        const bets = await response.json();
        const betList = document.querySelector('.bet-list');
        renderBetList(bets, betList);
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
