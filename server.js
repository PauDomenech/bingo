const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.BINGO_PASSWORD || 'bingo123';

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

// Block direct access to index.html unless authenticated
app.use((req, res, next) => {
  const reqPath = req.path || '/';
  if ((reqPath === '/' || reqPath === '/index.html') && !(req.cookies && req.cookies.authenticated === '1')) {
    return res.redirect('/login');
  }
  return next();
});

// Serve all static files from project root
app.use(express.static(path.join(__dirname)));

// Protect index.html behind a simple password cookie
app.get(['/', '/index.html'], (req, res) => {
  if (req.cookies && req.cookies.authenticated === '1') {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.cookies && req.cookies.authenticated === '1') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
  const pw = req.body.password || '';
  if (pw === PASSWORD) {
    res.cookie('authenticated', '1', { httpOnly: true });
    return res.redirect('/');
  }
  return res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
  res.clearCookie('authenticated');
  res.redirect('/login');
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
