const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Serve frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ========== Backend APIs ==========

app.get('/api/status', (req, res) => {
  res.json({ message: 'VDownloader backend is live and ready!' });
});

// Store clients for SSE
let clients = [];

// Progress SSE endpoint
app.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Add client
  clients.push(res);

  // Remove client when connection closes
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Function to send progress to all connected clients
function sendProgress(percent) {
  clients.forEach(client => {
    client.write(`data: ${percent}\n\n`);
  });
}

// Download API
app.post('/api/download', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'No URL provided' });

  // Spawn yt-dlp process
  const ytdlp = spawn('yt-dlp', ['-f', 'best', '--newline', url]);

  ytdlp.stdout.on('data', (data) => {
    const line = data.toString();
    // Look for progress percentage in yt-dlp stdout
    const match = line.match(/(\d{1,3}\.\d)%/);
    if (match) {
      const percent = parseFloat(match[1]);
      sendProgress(percent);
    }
  });

  ytdlp.stderr.on('data', (data) => {
    console.error('yt-dlp error:', data.toString());
  });

  ytdlp.on('close', (code) => {
    sendProgress(100); // make sure progress reaches 100% on finish
    console.log(`Download finished with code ${code}`);
  });

  res.json({ message: `Started downloading ${url}` });
});

// Serve index.html for all other routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
