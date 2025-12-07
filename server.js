import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy for Image Upload
app.use('/api/upload', createProxyMiddleware({
  target: 'https://img.scdn.io',
  changeOrigin: true,
  pathRewrite: {
    '^/api/upload': '/api/v1.php',
  },
}));

// Proxy for AI Generation
app.use('/api/generate', createProxyMiddleware({
  target: 'https://grsai.dakka.com.cn',
  changeOrigin: true,
  pathRewrite: {
    '^/api/generate': '/v1/draw/nano-banana',
  },
}));

// Proxy for Nominatim (if needed, though client uses direct URL mostly)
app.use('/nominatim', createProxyMiddleware({
  target: 'https://nominatim.openstreetmap.org',
  changeOrigin: true,
  pathRewrite: {
    '^/nominatim': '/search',
  },
}));

// Handle SPA history mode (fallback to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
