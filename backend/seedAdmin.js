require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seedAdmin = async () => {
  await connectDB();

  const adminExists = await User.findOne({ email: 'admin@portal.com' });

  if (adminExists) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123', salt);

  await User.create({
    name: 'Portal Admin',
    registerNumber: 'ADMIN001',
    email: 'admin@portal.com',
    phone: '9999999999',
    department: 'Administration',
    year: 'N/A',
    semester: 'N/A',
    password: hashedPassword,
    role: 'admin',
  });

  console.log('Admin user created successfully');
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
