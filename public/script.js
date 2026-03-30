const statusPill = document.getElementById('statusPill');
const connectForm = document.getElementById('connectForm');
const disconnectBtn = document.getElementById('disconnectBtn');
const chatForm = document.getElementById('chatForm');
const chatOutput = document.getElementById('chatOutput');
const logList = document.getElementById('logList');

const setStatus = (connected, username = '') => {
  statusPill.textContent = connected ? `Connected${username ? ` as ${username}` : ''}` : 'Disconnected';
  statusPill.className = `pill ${connected ? 'connected' : 'disconnected'}`;
};

const appendChat = (speaker, text) => {
  const row = document.createElement('div');
  row.className = 'log';
  row.textContent = `${speaker}: ${text}`;
  chatOutput.prepend(row);
};

const renderLogs = (logs = []) => {
  logList.innerHTML = '';
  logs.forEach((entry) => {
    const node = document.createElement('div');
    node.className = 'log';
    const meta = entry.meta && Object.keys(entry.meta).length ? ` ${JSON.stringify(entry.meta)}` : '';
    node.textContent = `[${entry.at}] ${entry.level.toUpperCase()} ${entry.message}${meta}`;
    logList.appendChild(node);
  });
};

const refreshStatus = async () => {
  const res = await fetch('/api/status');
  const data = await res.json();
  setStatus(Boolean(data.connected), data.username || '');
};

const refreshLogs = async () => {
  const res = await fetch('/api/logs');
  const data = await res.json();
  renderLogs(data.logs || []);
};

connectForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const proxyUrl = document.getElementById('proxyUrl').value.trim();

  const res = await fetch('/api/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password, proxyUrl }),
  });

  const data = await res.json();
  if (!data.ok) {
    appendChat('System', `Connect failed: ${data.error || 'Unknown error'}`);
  }

  await refreshStatus();
  await refreshLogs();
});

disconnectBtn.addEventListener('click', async () => {
  await fetch('/api/disconnect', { method: 'POST' });
  await refreshStatus();
  await refreshLogs();
});

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) {
    return;
  }

  appendChat('You', message);
  input.value = '';

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  appendChat('Heho', data.reply || data.error || 'No response');
  await refreshLogs();
});

void refreshStatus();
void refreshLogs();
setInterval(() => {
  void refreshStatus();
  void refreshLogs();
}, 3000);
