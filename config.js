const isTestMode = true; // Cambia questo valore per passare tra modalità test e produzione

const config = {
  apiBaseUrl: isTestMode ? 'http://localhost:3000' : 'https://legally-modest-joey.ngrok-free.app'
};

export default config;
