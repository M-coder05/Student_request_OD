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
  const {
    SUPER_ADMIN_NAME,
    SUPER_ADMIN_REGISTER_NUMBER,
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD,
  } = process.env;
  if (!SUPER_ADMIN_EMAIL?.trim() || !SUPER_ADMIN_PASSWORD || SUPER_ADMIN_PASSWORD.length < 12) {
    throw new Error('Set SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters before seeding');
  }

  const email = SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const registerNumber = SUPER_ADMIN_REGISTER_NUMBER?.trim() || 'SUPER-ADMIN-01';
  const findConfiguredAccounts = async () => {
    const accounts = await User.find({
      $or: [{ email }, { registerNumber }],
    }).select('_id email registerNumber role isDemo');

    const emailMatches = accounts.filter((account) => account.email === email);
    const registerNumberMatches = accounts.filter((account) => account.registerNumber === registerNumber);
    const sameAccount = emailMatches.length === 1
      && registerNumberMatches.length === 1
      && emailMatches[0]._id.equals(registerNumberMatches[0]._id);

    return { emailMatches, registerNumberMatches, sameAccount };
  };

  const throwConflict = ({ emailMatches, registerNumberMatches }, reason = '') => {
    const conflicts = [];
    if (emailMatches.length) conflicts.push('configured email');
    if (registerNumberMatches.length) conflicts.push('configured register number');

    if (emailMatches.length && registerNumberMatches.length
      && !emailMatches.some((emailAccount) => registerNumberMatches.some(
        (registerAccount) => emailAccount._id.equals(registerAccount._id)
      ))) {
      conflicts.length = 0;
      conflicts.push('configured email and register number (they belong to different accounts)');
    }

    throw new Error(
      `Super Admin initialization blocked: ${conflicts.join(' and ')} conflict with an existing account`
      + `${reason ? ` (${reason})` : ''}. Set both Super Admin identifiers to the verified account `
      + 'or resolve the account ownership manually.'
    );
  };

  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const existing = await findConfiguredAccounts();

  if (existing.emailMatches.length || existing.registerNumberMatches.length) {
    if (!existing.sameAccount) {
      throwConflict(existing);
    }

    const matchedAccount = existing.emailMatches[0];
    if (
      !['admin', 'super_admin'].includes(matchedAccount.role)
      || matchedAccount.isDemo === true
    ) {
      const reason = matchedAccount.isDemo === true
        ? 'the matched account is marked as demo'
        : `the matched account role is ${matchedAccount.role}`;
      throwConflict(existing, reason);
    }

    const superAdmin = await User.findById(matchedAccount._id);
    superAdmin.name = SUPER_ADMIN_NAME || 'Portal Owner';
    superAdmin.registerNumber = registerNumber;
    superAdmin.email = email;
    superAdmin.password = hashedPassword;
    superAdmin.role = 'super_admin';
    superAdmin.isDemo = false;
    await superAdmin.save();
    await disableLegacyAdmin(superAdmin._id);
    console.log('Super Admin Ready: verified configured email and register number belong to the same non-demo admin account');
    return;
  }

  try {
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
      isDemo: false,
    });
    await disableLegacyAdmin(superAdmin._id);
    console.log('Super Admin Ready: new account created');
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const concurrentAccount = await findConfiguredAccounts();
    if (
      concurrentAccount.sameAccount
      && ['admin', 'super_admin'].includes(concurrentAccount.emailMatches[0].role)
      && concurrentAccount.emailMatches[0].isDemo !== true
    ) {
      const superAdmin = await User.findById(concurrentAccount.emailMatches[0]._id);
      superAdmin.name = SUPER_ADMIN_NAME || 'Portal Owner';
      superAdmin.registerNumber = registerNumber;
      superAdmin.email = email;
      superAdmin.password = hashedPassword;
      superAdmin.role = 'super_admin';
      superAdmin.isDemo = false;
      await superAdmin.save();
      await disableLegacyAdmin(superAdmin._id);
      console.log('Super Admin Ready: existing account reused after concurrent initialization');
      return;
    }

    if (concurrentAccount.emailMatches.length || concurrentAccount.registerNumberMatches.length) {
      throwConflict(concurrentAccount);
    }

    throw new Error('Super Admin initialization stopped after a uniqueness conflict; inspect the user indexes and configured identifiers');
  }
};

if (require.main === module) {
  connectDB()
    .then(seedAdmin)
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error('Super Admin seeding failed:', error.message);
      await mongoose.disconnect();
      process.exitCode = 1;
    });
}

module.exports = seedAdmin;
