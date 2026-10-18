require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const odRoutes = require('./routes/odRoutes');
const bonafideRoutes = require('./routes/bonafideRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const adminRoutes = require('./routes/adminRoutes');
const requestsRoutes = require('./routes/requestsRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/od', odRoutes);
app.use('/api/bonafide', bonafideRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Smart Student Service Portal API is running' });
});

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }

  if (req.path.includes('.') || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images')) {
    return res.status(404).send('Not found');
  }

  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(errorMiddleware);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
