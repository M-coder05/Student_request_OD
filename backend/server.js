require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const odRoutes = require('./routes/odRoutes');
const bonafideRoutes = require('./routes/bonafideRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const adminRoutes = require('./routes/adminRoutes');
const requestsRoutes = require('./routes/requestsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const configRoutes = require('./routes/configRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const safeRequestUrl = require('./utils/safeRequestUrl');
const seedAdmin = require('./seedAdmin');
const User = require('./models/User');
const {
  getDemoAccounts,
  hasDemoCredentials,
  isDemoModeEnabled,
} = require('./config/demo');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;

if (process.env.RENDER && process.env.NODE_ENV !== 'production') {
  console.warn('[security] RENDER is set but NODE_ENV is not production; stack traces may be exposed.');
}

const logDemoReadiness = async () => {
  if (!isDemoModeEnabled()) {
    console.log('Demo Accounts Not Ready: demo mode is disabled');
    return;
  }

  if (!hasDemoCredentials()) {
    console.log('Demo Accounts Not Ready: demo credentials are not configured');
    return;
  }

  const accounts = getDemoAccounts();
  const [student, admin] = await Promise.all([
    User.exists({ email: accounts.student.email, role: 'student', isDemo: true, isActive: { $ne: false } }),
    User.exists({ email: accounts.admin.email, role: 'demo_admin', isDemo: true, isActive: { $ne: false } }),
  ]);

  if (student && admin) {
    console.log('Demo Accounts Ready');
    return;
  }

  console.log('Demo Accounts Not Ready: run npm run seed:demo');
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://unpkg.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'https://unpkg.com', 'data:'],
      'img-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://api.cloudinary.com'],
    },
  },
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
morgan.token('safe-url', safeRequestUrl);
app.use(morgan(':method :safe-url :status :response-time ms'));

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/od', odRoutes);
app.use('/api/bonafide', bonafideRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/config', configRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Smart Student Service Portal API is running' });
});

const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/api') {
    return res.status(404).json({ message: 'API route not found' });
  }

  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use(errorMiddleware);

const startServer = async () => {
  require('./utils/bonafidePdf').warnMissingCertificateSignatory();
  await connectDB();
  await seedAdmin();
  await logDemoReadiness();

  app.listen(PORT, () => {
    console.log(`Server Running on port ${PORT}`);
  });
};

startServer().catch(async (error) => {
  console.error('Server startup failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
