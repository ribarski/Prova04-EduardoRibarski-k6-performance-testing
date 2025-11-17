import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getDurationTrend = new Trend('get_duration_trend', true);
export const statusCodeRate = new Rate('status_code_rate');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.25'], 
    http_req_duration: ['p(90)<6800'],
    status_code_rate: ['rate>0.75'],
  },
  stages: [
    { duration: '30s', target: 7 },
    { duration: '2m', target: 92 },
    { duration: '1m', target: 0 } 
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  // --- ALTERAÇÃO: NOVA API (CROCODILE API DO K6) ---
  const baseUrl = 'https://test-api.k6.io';
  const endpoint = '/public/crocodiles/'; // Endpoint público que lista crocodilos
  
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const res = http.get(`${baseUrl}${endpoint}`, params);

  getDurationTrend.add(res.timings.duration);
  
  // Debug: Loga erro apenas se falhar
  if (res.status !== 200) {
      console.log(`Erro na Crocodile API: Status ${res.status}`); 
  }

  const isStatus200 = res.status === 200;
  statusCodeRate.add(isStatus200);

  check(res, {
    'GET Status is 200': () => isStatus200
  });

  // Sleep de 1 segundo é suficiente para essa API (Pacing realista)
  sleep(1); 
}