import { siteImages } from './siteImages.js';

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
        const response = await fetch('https://legally-modest-joey.ngrok-free.app/bets/all-active-bets', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });
        const bets = await response.json();
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
    preview.innerHTML = `
        <img src="${siteImages[site.toLowerCase()]}" alt="${site} logo" class="site-logo">
        <div class="bet-info">
            <p class="bet-amount">Importo: ${bet.importoGiocato}</p>
            <p class="potential-win">Vincita potenziale: ${bet.vincitaPotenziale}</p>
            <p class="bet-status">Stato: ${bet.esitoTotale}</p>
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
            <p><strong>Importo giocato:</strong> ${bet.importoGiocato}</p>
            <p><strong>Quota totale:</strong> ${bet.quotaTotale}</p>
            <p><strong>Vincita potenziale:</strong> ${bet.vincitaPotenziale}</p>
            <p><strong>Esito totale:</strong> ${bet.esitoTotale}</p>
            <h3>Eventi:</h3>
            <ul class="event-list">
                ${bet.events.map(event => `
                    <li class="event-item">
                        <p><strong>${event.name}</strong> - ${event.date}</p>
                        <p>Mercato: ${event.marketType}</p>
                        <p>Selezione: ${event.selection}</p>
                        <p>Quota: ${event.odds}</p>
                        <p>Stato: ${event.result}</p>
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
