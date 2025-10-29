const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ytDlp = require('yt-dlp-exec');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

let progressPercent = 0;

// Download route
app.post('/download', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const outputPath = path.join(downloadsDir, '%(title)s.%(ext)s');

  try {
    ytDlp.exec(url, {
      output: outputPath,
      progress: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      format: 'bestvideo+bestaudio/best',
    })
    .on('progress', p => {
      progressPercent = Math.floor(p.percent || 0);
    })
    .on('error', err => {
      console.error('Download error:', err);
    })
    .on('close', () => {
      progressPercent = 100;
    });

    res.json({ status: 'Download started' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Progress route
app.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    res.write(`data: ${progressPercent}\n\n`);
    if (progressPercent >= 100) clearInterval(interval);
  }, 1000);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
