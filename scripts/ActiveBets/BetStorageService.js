export function saveBetsToLocalStorage(bets) {
    localStorage.setItem('activeBets', JSON.stringify(bets));
}

export function loadBetsFromLocalStorage() {
    const savedBets = localStorage.getItem('activeBets');
    return savedBets ? JSON.parse(savedBets) : {};
}

export function saveRemovedBetsToLocalStorage(removedBets) {
    localStorage.setItem('removedBets', JSON.stringify(removedBets));
}

export function loadRemovedBetsFromLocalStorage() {
    const savedRemovedBets = localStorage.getItem('removedBets');
    return savedRemovedBets ? JSON.parse(savedRemovedBets) : {};
}


export function cleanupRemovedBets() {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    let removedBets = loadRemovedBetsFromLocalStorage();

    for (const site in removedBets) {
        removedBets[site] = removedBets[site].filter(bet =>
            bet.removedAt > sevenDaysAgo
        );
    }

    saveRemovedBetsToLocalStorage(removedBets);
}

setInterval(cleanupRemovedBets, 24 * 60 * 60 * 1000);

