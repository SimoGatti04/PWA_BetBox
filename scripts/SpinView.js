import { createSpinBox } from './SpinBox.js';
import { createBonusLogModal } from './BonusLogModal.js';

let bonusHistory = loadSpinHistory();
let isFetching = false;

export function createSpinView() {
  const view = document.createElement('div');
  view.className = 'spin-view';

  const sitesContainer = document.createElement('div');
  sitesContainer.className = 'sites-container';

  const sites = ['goldbet', 'lottomatica', 'snai'];
  const today = new Date().toISOString().split('T')[0];
  let shouldFetch = false;

  sites.forEach(site => {
    const lastBonus = bonusHistory[site] && bonusHistory[site].find(bonus => bonus.date.split('T')[0] === today);
    if (!lastBonus || lastBonus.result.tipo === 'N/A') {
      shouldFetch = true;
    }
    const spinBox = createSpinBox(site, lastBonus, () => performSpin(site), () => openBonusLog(site));
    if (lastBonus && lastBonus.result.tipo !== 'N/A') {
      spinBox.classList.add('bonus-today');
    }
    sitesContainer.appendChild(spinBox);
  });

  view.appendChild(sitesContainer);

  if (shouldFetch) {
    fetchSpinHistory().catch(error => console.error('Error fetching spin history:', error));
  }

  return view;
}

function saveSpinHistory(spinHistory) {
  localStorage.setItem('spinHistory', JSON.stringify(spinHistory));
}

function loadSpinHistory() {
  const spinHistory = localStorage.getItem('spinHistory');
  return spinHistory ? JSON.parse(spinHistory) : {};
}

async function fetchSpinHistory() {
  if (isFetching) {
    console.log('Richiesta già in corso, evitando duplicati.');
    return;
  }

  isFetching = true;

  const sites = ['goldbet', 'lottomatica', 'snai'];
  for (const site of sites) {
    try {
      const response = await fetch(`https://legally-modest-joey.ngrok-free.app/spin-history/${site}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const data = await response.json();
      bonusHistory[site] = data;
      updateSpinBox(site, data);
    } catch (error) {
      console.error(`Error fetching spin history for ${site}:`, error);
    }
  }
  saveSpinHistory(bonusHistory);

  isFetching = false;
}

function performSpin(site) {
  if (isFetching) {
    console.log(`Richiesta per il sito ${site} già in corso, evitando duplicati.`);
    return;
  }

  isFetching = true;

  fetch(`https://legally-modest-joey.ngrok-free.app/spin/${site}`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true'
    }
  })
    .then(response => response.json())
    .then(result => {
      console.log(`Spin result for ${site}:`, result);
      return fetchSpinHistory();
    })
    .catch(error => console.error(`Error performing spin for ${site}:`, error))
    .finally(() => {
      isFetching = false;
    });
}

function updateSpinBox(site, spinHistory) {
  const spinBox = document.querySelector(`.spin-box[data-site="${site}"]`);
  if (spinBox && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const bonusValue = spinBox.querySelector('.bonus-value');
    if (bonusValue) {
      bonusValue.textContent = `${lastSpin.result ? `${lastSpin.result.tipo}: ${lastSpin.result.valore}` : 'N/A'}`;
    } else {
      console.error(`Elemento .bonus-value non trovato per il sito ${site}`);
    }
    const today = new Date().toISOString().split('T')[0];
    if (lastSpin.date.split('T')[0] === today && lastSpin.result && lastSpin.result.tipo !== 'Nullo') {
      spinBox.classList.add('bonus-today');
    } else {
      spinBox.classList.remove('bonus-today');
    }
  }
}

function openBonusLog(site) {
  console.log(`Opening bonus log for site: ${site}`);
  const spinHistory = bonusHistory[site];
  if (spinHistory) {
    const modal = createBonusLogModal(site, spinHistory, formatDate, closeBonusLog);
    document.body.appendChild(modal);
    console.log(`Bonus log modal added to DOM for site: ${site}`);
  } else {
    console.error(`No bonus history found for site: ${site}`);
  }
}

function closeBonusLog() {
  const modal = document.querySelector('.modal-container');
  if (modal) {
    modal.remove();
    console.log('Bonus log modal removed from DOM');
  }
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

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isFetching) {
    console.log('Utente uscito dall\'app. Considero la richiesta chiusa.');
    isFetching = false;
  }
});
