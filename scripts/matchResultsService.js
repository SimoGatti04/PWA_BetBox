import config from '../config.js';

async function getMatchResult(events) {
    const now = Date.now();
    const eventsToFetch = events.filter(event => needsFetching(event, now));

    if (eventsToFetch.length === 0) {
        return events.map(e => e.matchResult);
    }

    try {
        let results = await getResultsFromFootballData(eventsToFetch);
        const remainingEvents = eventsToFetch.filter(e => !results[e.name]);

        if (remainingEvents.length > 0) {
            const fallbackResults = await getResultsFromFootballAPI(remainingEvents);
            results = { ...results, ...fallbackResults };
        }

        updateEventResults(events, results, now);
        return events.map(e => e.matchResult);
    } catch (error) {
        console.error('Error fetching match results:', error);
        return events.map(e => e.matchResult || null);
    }
}

function needsFetching(event, now) {
    const { matchResult } = event;
    if (!matchResult) return true;
    if (matchResult.status === 'FINISHED') return false;
    if (matchResult.status === 'IN_PLAY' && now - matchResult.lastUpdated < 5 * 60 * 1000) return false;
    return true;
}

async function getResultsFromFootballData(events) {
    return await fetchResults(`${config.apiBaseUrl}/proxy/football-data/match-results`, events);
}

async function getResultsFromFootballAPI(events) {
    return await fetchResults(`${config.apiBaseUrl}/proxy/football-api/match-results`, events);
}

async function fetchResults(url, events) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

function updateEventResults(events, results, now) {
    events.forEach(event => {
        if (results[event.name]) {
            event.matchResult = {
                ...results[event.name],
                lastUpdated: now
            };
        }
    });
}

export { getMatchResult };
