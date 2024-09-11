export function getStatusColor(status) {
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
export function getStatusColorSolid(status) {
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


export function showNoBetsMessage(container) {
    const message = document.createElement('div');
    message.className = 'no-bets-message';
    message.textContent = 'Nessuna scommessa attiva';
    container.appendChild(message);
}

export function formatDate(timestamp) {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}