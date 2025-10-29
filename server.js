const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ✅ Serve your frontend from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Create downloads folder if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

let progressPercent = 0;

// ✅ Handle video download
app.post('/download', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const outputTemplate = path.join(downloadsDir, '%(title)s.%(ext)s');

  const downloader = spawn('yt-dlp', [
    url,
    '-o', outputTemplate,
    '--newline',
    '--progress'
  ]);

  downloader.stdout.on('data', (data) => {
    const line = data.toString();
    const match = line.match(/(\d+\.\d+)%/);
    if (match) {
      progressPercent = Math.floor(parseFloat(match[1]));
    }
    console.log(line.trim());
  });

  downloader.stderr.on('data', (data) => {
    console.error('stderr:', data.toString());
  });

  downloader.on('close', (code) => {
    console.log(`Download finished with code ${code}`);
    progressPercent = 100;
  });

  res.json({ status: 'Download started' });
});

// ✅ Stream download progress
app.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    res.write(`data: ${progressPercent}\n\n`);
    if (progressPercent >= 100) clearInterval(interval);
  }, 1000);
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
