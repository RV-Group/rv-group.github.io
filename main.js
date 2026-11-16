const servers = [
    { id: 'server-1', relay: 'https://de.redgraun.ru/relay', name: 'RELAY-DE', color: '#4fc3f7' },
    { id: 'server-2', relay: 'https://pl.redgraun.ru/relay', name: 'RELAY-PL', color: '#64dd17' },
    { id: 'server-3', relay: 'https://vulkanhq.ru/relay-test', name: 'RELAY-RU', color: '#ff9800' }
];

(function () {
    var tokens = {
      'rv-group.github.io': '076fb8fdb082442984d14b427ed0b1cb',
      'status.vulkanhq.ru': '57e7a93f6e8f4978bcc79e748606097d'
    };
  
    var host = location.hostname.toLowerCase().replace(/^www\./, '');
    var token = tokens[host];
  
    if (!token) return;
  
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({
      token: token
    }));
  
    document.head.appendChild(s);
})();

const MAX_POINTS = 15;
const DEFAULT_COLORS = ['#4fc3f7', '#64dd17', '#ff9800', '#e040fb'];

const pingHistory = {};
for (const server of servers) {
    pingHistory[server.id] = [];
}

function getServerColor(server, index) {
    return server.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function getServerName(server) {
    if (server.name) return server.name;
    const container = document.getElementById(server.id);
    const titleEl = container ? container.querySelector('.server-title') : null;
    return titleEl ? titleEl.textContent : server.id;
}

function calcAverage(values) {
    const valid = values.filter(v => v !== null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / valid.length);
}

function updateLegendAndAverage() {
    const legendEl = document.getElementById('chart-legend');
    if (!legendEl) return;

    let html = '';

    servers.forEach((server, index) => {
        const avg = calcAverage(pingHistory[server.id] || []);
        const color = getServerColor(server, index);
        const name = getServerName(server);
        const avgText = avg !== null ? 'avg: ' + avg + ' ms' : 'avg: - ms';

        html +=
            '<div class="legend-row">' +
                '<span class="legend-name">' +
                    '<span class="legend-dot" style="background-color:' + color + '"></span>' +
                    name +
                '</span>' +
                '<span class="legend-avg">' + avgText + '</span>' +
            '</div>';
    });

    legendEl.innerHTML = html;
}

function drawChart() {
    const canvas = document.getElementById('ping-chart');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const padLeft = 38;
    const padRight = 10;
    const padTop = 10;
    const padBottom = 14;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    ctx.clearRect(0, 0, width, height);

    let maxPing = 0;
    let maxLen = 0;

    for (const server of servers) {
        const arr = pingHistory[server.id] || [];
        if (arr.length > maxLen) maxLen = arr.length;
        for (const val of arr) {
            if (val !== null && val > maxPing) {
                maxPing = val;
            }
        }
    }

    const step = Math.max(50, Math.ceil((maxPing * 1.15) / 150) * 50);
    const yMax = step * 3;

    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 3; i++) {
        const val = step * i;
        const y = padTop + plotH - (val / yMax) * plotH;

        ctx.strokeStyle = '#262626';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#757575';
        ctx.fillText(val + '', padLeft - 6, y);
    }

    if (maxLen === 0) {
        ctx.fillStyle = '#757575';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Collecting data...', padLeft + plotW / 2, padTop + plotH / 2);
        return;
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    servers.forEach((server, sIdx) => {
        const arr = pingHistory[server.id] || [];
        const color = getServerColor(server, sIdx);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        let isDrawing = false;

        for (let i = 0; i < arr.length; i++) {
            const val = arr[i];
            if (val === null) {
                if (isDrawing) {
                    ctx.stroke();
                    ctx.beginPath();
                    isDrawing = false;
                }
                continue;
            }

            const x = maxLen === 1
                ? padLeft + plotW / 2
                : padLeft + (i / (maxLen - 1)) * plotW;
            const y = padTop + plotH - (Math.min(val, yMax) / yMax) * plotH;

            if (!isDrawing) {
                ctx.moveTo(x, y);
                isDrawing = true;
            } else {
                ctx.lineTo(x, y);
            }
        }

        if (isDrawing) {
            ctx.stroke();
        }

        ctx.fillStyle = color;
        for (let i = 0; i < arr.length; i++) {
            const val = arr[i];
            if (val === null) continue;

            const x = maxLen === 1
                ? padLeft + plotW / 2
                : padLeft + (i / (maxLen - 1)) * plotW;
            const y = padTop + plotH - (Math.min(val, yMax) / yMax) * plotH;

            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function recordPing(serverId, value) {
    const arr = pingHistory[serverId];
    if (!arr) return;

    arr.push(value);
    if (arr.length > MAX_POINTS) {
        arr.shift();
    }

    updateLegendAndAverage();
    drawChart();
}

async function checkAllServers() {
    for (const server of servers) {
        const container = document.getElementById(server.id);
        if (!container) continue;

        const statusElement = container.querySelector('.status-val');
        const pingElement = container.querySelector('.ping-val');
        if (!statusElement || !pingElement) continue;

        const controller = new AbortController();
        let isTimeout = false;
        const timeout = setTimeout(() => {
            isTimeout = true;
            controller.abort();
        }, 5000);

        statusElement.textContent = 'Checking...';
        statusElement.className = 'status-val status';

        try {
            const startTime = performance.now();
            const response = await fetch(server.relay, { cache: "no-store", signal: controller.signal });
            const endTime = performance.now();
            const pingMs = Math.round(endTime - startTime);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 'online') {
                    statusElement.textContent = 'Online';
                    statusElement.className = 'status-val status-online';
                    recordPing(server.id, pingMs);
                } else {
                    statusElement.textContent = 'Offline';
                    statusElement.className = 'status-val status-offline';
                    recordPing(server.id, null);
                }

                pingElement.textContent = pingMs + ' ms';
                
                if (pingMs < 120) {
                    pingElement.className = 'ping-val status-online';
                } else if (pingMs < 190) {
                    pingElement.className = 'ping-val status';
                } else {
                    pingElement.className = 'ping-val status-offline';
                }
            } else {
                throw new Error('HTTP ' + response.status);
            }
        } catch (error) {
            statusElement.textContent = 'Offline';
            statusElement.className = 'status-val status-offline';
            pingElement.textContent = isTimeout ? 'Timeout' : 'Error';
            pingElement.className = 'ping-val status-offline';
            recordPing(server.id, null);
        } finally {
            clearTimeout(timeout);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

async function startMonitoring() {
    try {
        await checkAllServers();
    } catch (error) {
        console.error('Monitoring error:', error);
    } finally {
        setTimeout(startMonitoring, 15000);
    }
}

window.addEventListener('resize', drawChart);
updateLegendAndAverage();
drawChart();
startMonitoring();