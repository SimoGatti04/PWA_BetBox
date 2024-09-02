import { siteImages } from './siteImages.js';

export function createBalanceView() {
    const view = document.createElement('div');
    view.className = 'balances-container';

    const sites = ['goldbet', 'bet365', 'eurobet', 'sisal', 'snai', 'lottomatica', 'cplay'];
    sites.forEach(site => {
        const card = createBalanceCard(site);
        view.appendChild(card);
    });

    return view;
}

function createBalanceCard(site) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.site = site;

    const icon = document.createElement('img');
    icon.src = siteImages[site];
    icon.className = 'icon';
    card.appendChild(icon);

    const balance = document.createElement('p');
    balance.className = 'balance-text';
    balance.textContent = 'N/A';
    card.appendChild(balance);

    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.textContent = '↻';
    refreshButton.addEventListener('click', () => fetchBalance(site));
    card.appendChild(refreshButton);

    return card;
}

async function fetchBalance(site) {
    try {
        console.log(`Fetching balance for site: ${site}`);
        const response = await fetch(`https://legally-modest-joey.ngrok-free.app/balances/${site}`, {
            method: 'GET',
            headers: new Headers({
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': '69420' // Add this header to bypass the interstitial page
            })
        });

        console.log('Request headers:', {
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': '69420'
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Received data for site ${site}:`, data);
        updateBalance(site, data.balance);
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}


function updateBalance(site, balance) {
    const balanceBox = document.querySelector(`.card[data-site="${site}"]`);
    if (balanceBox) {
        const balanceText = balanceBox.querySelector('.balance-text');
        balanceText.textContent = balance;
    }
}
