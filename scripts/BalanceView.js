import { siteImages } from './siteImages.js';

function saveBalances(balances) {
    localStorage.setItem('balances', JSON.stringify(balances));
}

function loadBalances() {
    const balances = localStorage.getItem('balances');
    return balances ? JSON.parse(balances) : {};
}

export function createBalanceView() {
    const view = document.createElement('div');
    view.className = 'balances-container';

    const sites = ['goldbet', 'bet365', 'eurobet', 'sisal', 'snai', 'lottomatica', 'cplay'];
    const balances = loadBalances();

    sites.forEach(site => {
        const card = createBalanceCard(site, balances[site]);
        view.appendChild(card);
    });

    return view;
}

export async function fetchAllRecentBalances() {
    try {
        const response = await fetch('https://legally-modest-joey.ngrok-free.app/balance-history/recent', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });

        if (!response.ok) {
            throw new Error(`Errore HTTP! status: ${response.status}`);
        }

        const data = await response.json();
        updateAllBalances(data);
    } catch (error) {
        console.error('Errore nel recupero dei saldi recenti:', error);
    }
}

function updateAllBalances(balances) {
    for (const [site, balance] of Object.entries(balances)) {
        updateBalance(site, balance);
    }
}


function createBalanceCard(site, balance) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.site = site;

    // Crea un elemento immagine di sfondo
    const backgroundImage = document.createElement('img');
    backgroundImage.src = siteImages[site];
    backgroundImage.className = 'background-image';
    card.appendChild(backgroundImage);

    const balanceText = document.createElement('p');
    balanceText.className = 'balance-text';
    balanceText.textContent = balance || 'N/A';
    card.appendChild(balanceText);

    // Pulsante per aggiornare il saldo (freccia)
    const historyButton = document.createElement('button');
    historyButton.className = 'history-button';
    historyButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
    historyButton.addEventListener('click', async () => {
        const history = await fetchBalanceHistory(site);
        if (history) {
            const latestBalance = history[history.length - 1];
            updateBalance(site, latestBalance);
        }
    }); // Aggiorna il saldo senza visualizzare il modal
    card.appendChild(historyButton);

    // Pulsante per recuperare il saldo (play)
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.innerHTML = '<i class="fas fa-play"></i>';
    playButton.addEventListener('click', () => fetchBalance(site));
    card.appendChild(playButton);

    // Pulsante per visualizzare il log
    const logButton = document.createElement('button');
    logButton.className = 'log-button';
    logButton.innerHTML = '<i class="fas fa-clipboard-list"></i>';
    logButton.addEventListener('click', () => {
        const balanceHistory = loadBalanceHistory();
        const history = balanceHistory[site] || [];
        const modal = createBalanceHistoryModal(site, history);
        document.body.appendChild(modal);
    }); // Visualizza il modal
    card.appendChild(logButton);

    return card;
}


async function openBalanceHistory(site) {
    const history = await fetchBalanceHistory(site);
    if (history) {
        const modal = createBalanceHistoryModal(site, history);
        document.body.appendChild(modal);
    } else {
        console.error('Errore nel recupero della cronologia dei saldi:', error);
    }
}


function createBalanceHistoryModal(site, history) {
    console.log(`Creazione del modal per ${site} con i dati:`, history); // Log dei dati passati alla funzione

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
    title.textContent = `Cronologia saldi per ${site}`;
    modalContent.appendChild(title);

    const balanceList = document.createElement('ul');
    balanceList.className = 'balance-list';

    if (Array.isArray(history)) {
        history.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.textContent = `${formatDate(entry.date)} - ${entry.balance}`;
            balanceList.appendChild(listItem);
        });
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = 'Nessuna cronologia disponibile';
        balanceList.appendChild(listItem);
    }

    modalContent.appendChild(balanceList);
    modalContainer.appendChild(modalContent);

    return modalContainer;
}



function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function fetchBalance(site) {
    try {
        console.log(`Recupero saldo per il sito: ${site}`);
        const response = await fetch(`https://legally-modest-joey.ngrok-free.app/balances/${site}`, {
            method: 'GET',
            headers: new Headers({
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            })
        });

        console.log('Stato della risposta:', response.status);
        console.log('Headers della risposta:', response.headers);

        if (!response.ok) {
            throw new Error(`Errore HTTP! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Dati ricevuti per il sito ${site}:`, data);

        if (data.balance === null || data.balance === undefined) {
            throw new Error('Saldo non disponibile');
        }

        updateBalance(site, data.balance);
    } catch (error) {
        console.error('Errore nel recupero del saldo:', error);
        updateBalance(site, 'Errore');
    }
}
let isFetchingHistory = false;

async function fetchBalanceHistory(site) {
    try {
        const response = await fetch(`https://legally-modest-joey.ngrok-free.app/balance-history/${site}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            }
        });

        if (!response.ok) {
            throw new Error(`Errore HTTP! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Dati ricevuti per ${site}:`, data); // Log dei dati ricevuti

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Cronologia non disponibile');
        }

        // Salva i dati recuperati in modo persistente
        saveBalanceHistory(site, data);

        return data; // Restituisci i dati
    } catch (error) {
        console.error('Errore nel recupero della cronologia dei saldi:', error);
        return null; // Restituisci null in caso di errore
    }
}

function saveBalanceHistory(site, history) {
    const balanceHistory = loadBalanceHistory();
    balanceHistory[site] = history;
    localStorage.setItem('balanceHistory', JSON.stringify(balanceHistory));
}

function loadBalanceHistory() {
    const balanceHistory = localStorage.getItem('balanceHistory');
    return balanceHistory ? JSON.parse(balanceHistory) : {};
}




function displayBalanceHistory(site, history) {
    if (history === null) {
        console.log(`Cronologia saldi non disponibile per ${site}`);
        alert(`Cronologia saldi non disponibile per ${site}`);
    } else {
        openBalanceHistory(site, history);
    }
}


function updateBalance(site, balanceData) {
    const balances = loadBalances();
    let balanceToDisplay = 'N/A';

    if (balanceData && typeof balanceData === 'object') {
        if (balanceData.balance) {
            balanceToDisplay = balanceData.balance;
        } else if (balanceData.date && balanceData.balance) {
            balanceToDisplay = balanceData.balance;
        }
    } else if (typeof balanceData === 'string') {
        balanceToDisplay = balanceData;
    }

    balances[site] = balanceToDisplay;
    saveBalances(balances);
    renderBalances(balances);
}


function renderBalances(balances) {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const site = card.dataset.site;
        const balanceText = card.querySelector('.balance-text');
        balanceText.textContent = balances[site] || 'N/A';
    });
}

function checkAndFetchBalancesOnceADay() {
    const lastFetchDate = localStorage.getItem('lastFetchDate');
    const currentDate = new Date();
    const currentHour = currentDate.getHours();

    // Controlla se l'ultima fetch è stata fatta oggi dopo le 10 di mattina
    if (lastFetchDate) {
        const lastFetch = new Date(lastFetchDate);
        const isSameDay = currentDate.toDateString() === lastFetch.toDateString();
        const isAfter10AM = currentHour >= 10;

        if (isSameDay && isAfter10AM) {
            console.log('Le route sono già state chiamate oggi dopo le 10 di mattina.');
            return;
        }
    }

    // Se non è stata fatta oggi dopo le 10 di mattina, chiama le route
    if (currentHour >= 10) {
        fetchAllSingleBoxRoutes();
        localStorage.setItem('lastFetchDate', currentDate.toISOString());
    }
}

async function fetchAllSingleBoxRoutes() {
    const sites = ['goldbet', 'bet365', 'eurobet', 'sisal', 'snai', 'lottomatica', 'cplay'];
    for (const site of sites) {
        const history = await fetchBalanceHistory(site);
        if (history) {
            const latestBalance = history[history.length - 1];
            updateBalance(site, latestBalance);
        }
    }
}

function initializeBalances() {
    const balances = loadBalances();
    renderBalances(balances);
    checkAndFetchBalancesOnceADay();
}

document.addEventListener('DOMContentLoaded', initializeBalances);
