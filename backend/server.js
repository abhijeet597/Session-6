const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const habitsRouter = require('./routes/habits');
const categoriesRouter = require('./routes/categories');
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const requireAuth = require('./middleware/requireAuth');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/habits', requireAuth, habitsRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
  }

  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/habit-tracker')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;