import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6'; // <--- IMPORTANTE: Importe o sleep
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
  const baseUrl = 'https://reqres.in';
  const endpoint = '/api/users?page=2';
  
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const res = http.get(`${baseUrl}${endpoint}`, params);

  getDurationTrend.add(res.timings.duration);
  
  // Log de debug: Se der erro, mostra qual status code está retornando no terminal
  if (res.status !== 200) {
      console.log(`Erro: Status ${res.status}`); 
  }

  const isStatus200 = res.status === 200;
  statusCodeRate.add(isStatus200);

  check(res, {
    'GET Status is 200': () => isStatus200
  });

  // <--- A CORREÇÃO MÁGICA
  // Faz o usuário esperar 1 segundo antes da próxima repetição.
  // Isso reduz o RPS (Requests per Second) mas mantém os 92 usuários simultâneos ativos.
  sleep(1); 
}