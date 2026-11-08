const servers = [
    { id: 'server-1', relay: 'https://de.redgraun.ru/relay' },
    { id: 'server-2', relay: 'https://pl.redgraun.ru/relay' },
    { id: 'server-3', relay: 'https://vulkanhq.ru/relay-test' }
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

async function checkAllServers() {
    for (const server of servers) {
        const container = document.getElementById(server.id);
        const statusElement = container.querySelector('.status-val');
        const pingElement = container.querySelector('.ping-val');

        statusElement.textContent = 'Checking...';
        statusElement.className = 'status-val status';

        try {
            const startTime = performance.now();
            
            const response = await fetch(server.relay, { cache: "no-store" });
            
            const endTime = performance.now();
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.status === 'online') {
                    statusElement.textContent = 'Online';
                    statusElement.className = 'status-val status-online';
                } else {
                    statusElement.textContent = 'Offline';
                    statusElement.className = 'status-val status-offline';
                }

                const pingMs = Math.round(endTime - startTime);
                pingElement.textContent = pingMs + ' ms';
                
                if (pingMs < 120) {
                    pingElement.className = 'ping-val status-online';
                } else if (pingMs < 190) {
                    pingElement.className = 'ping-val status';
                } else {
                    pingElement.className = 'ping-val status-offline';
                }
            } else {
                throw new Error();
            }
        } catch (error) {
            statusElement.textContent = 'Offline';
            statusElement.className = 'status-val status-offline';
            pingElement.textContent = 'Timeout';
            pingElement.className = 'ping-val status-offline';
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

async function startMonitoring() {
    await checkAllServers();
    setTimeout(startMonitoring, 15000);
}

startMonitoring();