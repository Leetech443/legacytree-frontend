// Local development uses your local API; anything else uses the deployed Render URL.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
window.APP_CONFIG = {
  API_BASE: isLocal ? 'http://localhost:5000' : 'https://legacytree-api.onrender.com', // <- put your Render URL here
};
