#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const API_BASE = 'https://ask-gateway.r95426882.workers.dev';
const USER_AGENT = 'research-setup/1.0';

function fetchJson(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = require('https').get(url, { headers: { 'User-Agent': USER_AGENT, ...extraHeaders } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('error', reject);
  });
}

function fetchText(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = require('https').get(url, { headers: { 'User-Agent': USER_AGENT, ...extraHeaders } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

function ensureDir(dir, mode) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode });
  }
}

function hasSymlinkInPath(dir) {
  const parts = dir.split(path.sep).filter(Boolean);
  let current = path.sep;
  for (const part of parts) {
    current = path.join(current, part);
    const lstat = fs.lstatSync(current);
    if (lstat.isSymbolicLink()) return true;
  }
  return false;
}

function findPython() {
  const candidates = ['python3', '/usr/bin/python3'];
  const probe = 'import plistlib, zipfile';
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['-c', probe], { encoding: 'utf8' });
    if (result.status === 0) return candidate;
  }
  return null;
}

async function checkReady(deviceToken) {
  try {
    const data = await fetchJson(`${API_BASE}/api/device/research-setup`, {
      Authorization: 'Bearer ' + deviceToken
    });
    if (data.status === 'ready') return true;
  } catch (e) {
    // Fall through to fresh setup
  }
  return false;
}

async function main() {
  const home = os.homedir();
  const ROOT = path.join(home, 'Library', 'Application Support', 'ResearchRunner');
  const devicePath = path.join(ROOT, 'device.json');

  // Check if already set up
  if (fs.existsSync(devicePath)) {
    try {
      const device = JSON.parse(fs.readFileSync(devicePath, 'utf8'));
      if (device.device_token && await checkReady(device.device_token)) {
        console.log('Research service setup already complete.');
        process.exit(0);
      }
    } catch (e) {
      // Fall through to fresh setup
    }
  }

  // Fresh setup
  try {
    // Fetch the Python script
    const scriptContent = await fetchText(`${API_BASE}/api/research/setup`);
    if (!scriptContent) {
      throw new Error('Empty script response');
    }

    // Create root directory
    ensureDir(ROOT, 0o700);

    // Write the script
    const scriptPath = path.join(ROOT, 'research-setup.py');
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o600 });

    // Find a working Python
    const python = findPython();
    if (!python) {
      console.error('No suitable Python interpreter found');
      process.exit(1);
    }

    // Run the setup script
    const result = spawnSync(python, [scriptPath], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error('Setup script exited with error');
      process.exit(result.status || 1);
    }
  } catch (e) {
    console.error('Setup failed: ' + e.message);
    process.exit(1);
  }
}

main();
