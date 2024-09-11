import config from '../../config.js';
import { getMatchResult } from '../matchResultsService.js';
import {
    loadBetsFromLocalStorage,
    loadRemovedBetsFromLocalStorage,
    saveBetsToLocalStorage,
    saveRemovedBetsToLocalStorage
} from "./BetStorageService.js";
import {renderBetList} from "./ActiveBetsView.js";

export const BET_UPDATED_EVENT = 'betUpdated';

export async function fetchActiveBets() {
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
        await refreshAllBets();
    } catch (error) {
        console.error('Errore nel recupero delle scommesse attive:', error);
    }
}

export async function refreshAllBets() {
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
        const betList = document.querySelector('.bet-list');
        renderBetList(updatedBets, betList);
        saveBetsToLocalStorage(updatedBets);
        updateMatchResultsIfNeeded(updatedBets, betList);
    } catch (error) {
        console.error('Errore nel refresh delle scommesse:', error);
        const savedBets = loadBetsFromLocalStorage();
        renderBetList(savedBets, document.querySelector('.bet-list'));
    }
}

export async function updateSiteBets(site) {
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
        await refreshAllBets();
    } catch (error) {
        console.error(`Error updating active bets for ${site}:`, error);
    }
}

export function updateMatchResultsIfNeeded(bets, betList) {
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
                if (event.matchResult === "N/A"){
                    return true;
                }
                return false; // Don't update finished matches
            }) : []
        )
    );

    if (eventsToUpdate.length > 0) {
        updateMatchResults(eventsToUpdate, bets, betList);
    }
}

export async function updateMatchResults(events, bets, betList) {
    const updatedResults = await getMatchResult(events);

    for (const site in bets) {
        bets[site] = bets[site].map(bet => ({
            ...bet,
            events: bet.events.map(event => {
                const updatedResult = updatedResults.find(r => r.name === event.name);
                return updatedResult ? { ...event, matchResult: updatedResult } : event;
            })
        }));
    }

    localStorage.setItem('lastResultRequestTime', Date.now().toString());
    saveBetsToLocalStorage(bets);
    renderBetList(bets, betList);
    window.dispatchEvent(new CustomEvent(BET_UPDATED_EVENT, { detail: bets }));
}


export function mergeServerAndLocalBets(savedBets, comparison) {
    const updatedBets = { ...savedBets };
    const now = Date.now();
    let removedBets = loadRemovedBetsFromLocalStorage();

    for (const site in comparison) {
        updatedBets[site] = updatedBets[site] || [];
        removedBets[site] = removedBets[site] || [];

        comparison[site].toRemove.forEach(betId => {
            const removedBet = updatedBets[site].find(bet => bet.betId === betId);
            if (removedBet) {
                removedBets[site].push({
                    ...removedBet,
                    removedAt: now
                });
            }
        });

        updatedBets[site] = updatedBets[site].filter(bet =>
            !comparison[site].toRemove.includes(bet.betId)
        );
        updatedBets[site].push(...comparison[site].toAdd);
    }

    saveRemovedBetsToLocalStorage(removedBets);
    return updatedBets;
}

