import { siteImages } from '../siteImages.js';
import {fetchActiveBets, refreshAllBets, updateMatchResultsIfNeeded, updateSiteBets} from "./BetService.js";
import {loadBetsFromLocalStorage, loadRemovedBetsFromLocalStorage} from "./BetStorageService.js";

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
    removedBets = loadRemovedBetsFromLocalStorage();

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

function showBetHistory() {
    const removedBets = loadRemovedBetsFromLocalStorage();
    const historyModal = createBetHistoryModal(removedBets);
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

    const historyList = document.createElement('div');
    historyList.className = 'bet-list history-list scrollable-content';

    for (const site in history) {
        history[site].forEach(bet => {
            const betPreview = createBetPreview(site, bet);
            historyList.appendChild(betPreview);
        });
    }

    modalContent.appendChild(historyList);
    modalContainer.appendChild(modalContent);

    return modalContainer;
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

let removedBets = {};


export function renderBetList(bets, container) {
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
            ${bet.removedAt ? `<p class="removed-date">Rimossa: ${formatDate(bet.removedAt)}</p>` : ''}
        </div>
    `;
    preview.addEventListener('click', () => showBetDetails(bet, true));
    return preview;
}

function showBetDetails(bet, isHistorical = false) {
    const detailView = document.createElement('div');
    detailView.className = 'bet-detail-view';

    const updateDetailView = (event) => {
        if (!isHistorical) {
            const updatedBets = event.detail;
            const updatedBet = Object.values(updatedBets)
                .flat()
                .find(b => b.betId === bet.betId);

            if (updatedBet) {
                detailView.innerHTML = createBetDetailContent(updatedBet, isHistorical);
                attachCloseButtonListener(detailView, updateDetailView);
            }
        }
    };

    detailView.innerHTML = createBetDetailContent(bet, isHistorical);
    attachCloseButtonListener(detailView, updateDetailView);

    if (!isHistorical) {
        window.addEventListener(BET_UPDATED_EVENT, updateDetailView);
    }

    document.body.appendChild(detailView);
}


function attachCloseButtonListener(detailView, updateDetailView) {
    const closeButton = detailView.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(detailView);
        window.removeEventListener(BET_UPDATED_EVENT, updateDetailView);
    });
}


function createBetDetailContent(bet, isHistorical) {
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


function showNoBetsMessage(container) {
    const message = document.createElement('div');
    message.className = 'no-bets-message';
    message.textContent = 'Nessuna scommessa attiva';
    container.appendChild(message);
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



