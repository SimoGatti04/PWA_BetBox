const isTestMode = false; // Cambia questo valore per passare tra modalità test e produzione

const config = {
  apiBaseUrl: isTestMode ? 'http://localhost:3000' : '${config.apiBaseUrl}'
};

export default config;
