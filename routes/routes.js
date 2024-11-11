import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const OSM_API = 'https://nominatim.openstreetmap.org';
const ROUTE_API = 'https://router.project-osrm.org/route/v1/driving';

const headers = {
  'User-Agent': 'MobiAcess/1.0',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

// Função para fazer fetch com retry
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Espera crescente entre tentativas
    }
  }
};

// Busca localização
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Recebida busca para:', q);

    if (!q) {
      return res.status(400).json({ error: 'Parâmetro de busca é necessário' });
    }

    const url = `${OSM_API}/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=br`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const locations = data.map(item => ({
      id: item.place_id,
      name: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }));

    res.json(locations);
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ error: error.message });
  }
});

// Busca rota entre dois pontos
router.get('/route', async (req, res) => {
  try {
    const { 
      startLat, 
      startLng, 
      endLat, 
      endLng 
    } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ 
        error: 'Coordenadas de origem e destino são necessárias' 
      });
    }

    const url = `${ROUTE_API}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const route = {
      route: data.routes[0].geometry.coordinates,
      distance: data.routes[0].distance,
      duration: data.routes[0].duration
    };

    res.json(route);
  } catch (error) {
    console.error('Erro ao obter rota:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota completa (busca localização e cria rota)
router.post('/complete-route', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Origem e destino são necessários' 
      });
    }

    // Busca origem
    const originUrl = `${OSM_API}/search?q=${encodeURIComponent(origin)}&format=json&limit=1&countrycodes=br`;
    const originResponse = await fetchWithRetry(originUrl, { headers });
    const [originData] = await originResponse.json();

    // Busca destino
    const destUrl = `${OSM_API}/search?q=${encodeURIComponent(destination)}&format=json&limit=1&countrycodes=br`;
    const destResponse = await fetchWithRetry(destUrl, { headers });
    const [destData] = await destResponse.json();

    if (!originData || !destData) {
      throw new Error('Não foi possível encontrar os endereços');
    }

    // Busca rota
    const routeUrl = `${ROUTE_API}/${originData.lon},${originData.lat};${destData.lon},${destData.lat}?overview=full&geometries=geojson`;
    const routeResponse = await fetchWithRetry(routeUrl, { headers });
    const routeData = await routeResponse.json();

    const result = {
      origin: {
        name: originData.display_name,
        latitude: parseFloat(originData.lat),
        longitude: parseFloat(originData.lon)
      },
      destination: {
        name: destData.display_name,
        latitude: parseFloat(destData.lat),
        longitude: parseFloat(destData.lon)
      },
      route: routeData.routes[0].geometry.coordinates,
      distance: routeData.routes[0].distance,
      duration: routeData.routes[0].duration
    };

    res.json(result);
  } catch (error) {
    console.error('Erro na rota completa:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 