require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const disableLegacyAdmin = async (superAdminId) => {
  await User.updateOne(
    {
      email: 'admin@portal.com',
      registerNumber: 'ADMIN001',
      role: 'admin',
      isDemo: { $ne: true },
      _id: { $ne: superAdminId },
    },
    { $set: { isActive: false } }
  );
};

const seedAdmin = async () => {
  const { SUPER_ADMIN_NAME, SUPER_ADMIN_REGISTER_NUMBER, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;
  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD || SUPER_ADMIN_PASSWORD.length < 12) {
    throw new Error('Set SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters before seeding');
  }

  await connectDB();

  const email = SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const registerNumber = SUPER_ADMIN_REGISTER_NUMBER || 'SUPER-ADMIN-01';
  const adminExists = await User.findOne({ $or: [{ email }, { registerNumber }] });

  if (adminExists) {
    if (adminExists.email !== email || (adminExists.role !== 'admin' && adminExists.role !== 'super_admin') || adminExists.isDemo) {
      throw new Error('Super Admin email or register number is already assigned to another account');
    }
    adminExists.name = SUPER_ADMIN_NAME || 'Portal Owner';
    adminExists.registerNumber = registerNumber;
    adminExists.password = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
    adminExists.role = 'super_admin';
    adminExists.isDemo = false;
    await adminExists.save();
    await disableLegacyAdmin(adminExists._id);
    console.log('Super Admin account updated');
    return;
  }

  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

  const superAdmin = await User.create({
    name: SUPER_ADMIN_NAME || 'Portal Owner',
    registerNumber,
    email,
    phone: process.env.SUPER_ADMIN_PHONE || '0000000000',
    department: 'Administration',
    year: 'N/A',
    semester: 'N/A',
    password: hashedPassword,
    role: 'super_admin',
  });
  await disableLegacyAdmin(superAdmin._id);

  console.log('Super Admin account created successfully');
};

seedAdmin()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exitCode = 1;
});
