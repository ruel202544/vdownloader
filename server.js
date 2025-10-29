const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ytDlp = require('yt-dlp-exec');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

let progressPercent = 0;

// EventStream for live progress updates
app.get('/progress', (req, res) => {
    res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
    });
    res.flushHeaders();

    const interval = setInterval(() => {
        res.write(`data: ${progressPercent}\n\n`);
    }, 1000);

    req.on('close', () => clearInterval(interval));
});

// Download endpoint
app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    progressPercent = 0;

    try {
        console.log(`Downloading: ${url}`);
        const ytdlp = ytDlp.exec(url, {
            output: path.join(downloadsDir, '%(title)s.%(ext)s'),
            format: 'mp4',
            mergeOutputFormat: 'mp4',  // ensures both video & audio
            progress: true
        });

        ytdlp.stdout.on('data', (data) => {
            const match = data.toString().match(/(\d+(?:\.\d+)?)%/);
            if (match) {
                progressPercent = parseFloat(match[1]);
            }
        });

        ytdlp.stderr.on('data', (data) => {
            console.error('yt-dlp error:', data.toString());
        });

        ytdlp.on('close', (code) => {
            console.log(`Download finished with code ${code}`);
            progressPercent = 100;
        });

        res.json({ status: 'Download started' });
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Serve static files (optional)
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(PORT, () => { app.get('/', (req, res) => {
    res.send('🎉 VDownloader backend is live and ready!');
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`Downloads directory: ${downloadsDir}`);
});

    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`Downloads directory: ${downloadsDir}`);
});
