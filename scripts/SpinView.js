import { createSpinBox } from './SpinBox.js';
import { createBonusLogModal } from './BonusLogModal.js';

let bonusHistory = loadSpinHistory(); // Carica la cronologia dei bonus dal localStorage

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
      spinBox.classList.add('bonus-today'); // Aggiungi la classe per lo sfondo verde
    }
    sitesContainer.appendChild(spinBox);
  });

  view.appendChild(sitesContainer);

  if (shouldFetch) {
    fetchSpinHistory().catch(error => console.error('Error fetching spin history:', error));
  }

  return view;
}

// Funzione per salvare i bonus nel localStorage
function saveSpinHistory(spinHistory) {
  localStorage.setItem('spinHistory', JSON.stringify(spinHistory));
}

// Funzione per caricare i bonus dal localStorage
function loadSpinHistory() {
  const spinHistory = localStorage.getItem('spinHistory');
  return spinHistory ? JSON.parse(spinHistory) : {};
}

async function fetchSpinHistory() {
  const sites = ['goldbet', 'lottomatica', 'snai'];
  for (const site of sites) {
    try {
      const response = await fetch(`https://legally-modest-joey.ngrok-free.app/spin-history/${site}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true' // Add this header to bypass the interstitial page
        }
      });
      const data = await response.json();
      bonusHistory[site] = data; // Salva la cronologia dei bonus nella variabile globale
      updateSpinBox(site, data);
    } catch (error) {
      console.error(`Error fetching spin history for ${site}:`, error);
    }
  }
  saveSpinHistory(bonusHistory); // Salva la cronologia dei bonus nel localStorage
}

function performSpin(site) {
  fetch(`https://legally-modest-joey.ngrok-free.app/spin/${site}`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true' // Add this header to bypass the interstitial page
    }
  })
    .then(response => response.json())
    .then(result => {
      console.log(`Spin result for ${site}:`, result);
      fetchSpinHistory().catch(error => console.error('Error fetching spin history:', error));
    })
    .catch(error => console.error(`Error performing spin for ${site}:`, error));
}

function updateSpinBox(site, spinHistory) {
  const spinBox = document.querySelector(`.spin-box[data-site="${site}"]`);
  if (spinBox && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const bonusText = spinBox.querySelector('.bonus-text');
    bonusText.textContent = `Ultimo bonus: ${lastSpin.result.tipo}: ${lastSpin.result.valore}`;
    const today = new Date().toISOString().split('T')[0];
    if (lastSpin.date.split('T')[0] === today && lastSpin.result.tipo !== 'N/A') {
      spinBox.classList.add('bonus-today'); // Aggiungi la classe per lo sfondo verde
    } else {
      spinBox.classList.remove('bonus-today'); // Rimuovi la classe se non è un bonus odierno
    }
  }
}

function openBonusLog(site) {
  console.log(`Opening bonus log for site: ${site}`);
  const spinHistory = bonusHistory[site]; // Recupera la cronologia dei bonus dalla variabile globale
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
