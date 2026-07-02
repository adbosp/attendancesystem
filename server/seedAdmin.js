import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@attendance.local';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const adminName = process.env.ADMIN_NAME || 'Admin';

  const existingAdmin = await User.findOne({
    $or: [{ username: adminUsername }, { email: adminEmail }, { role: 'admin' }],
  }).select('+password');

  if (existingAdmin) {
    existingAdmin.name = adminName;
    existingAdmin.username = adminUsername;
    existingAdmin.email = adminEmail;
    existingAdmin.password = adminPassword;
    existingAdmin.role = 'admin';
    existingAdmin.isActive = true;
    await existingAdmin.save();
    console.log(`Admin account updated: ${adminUsername}`);
  } else {
    await User.create({
      name: adminName,
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });
    console.log(`Admin account created: ${adminUsername}`);
  }

  await mongoose.connection.close();
};

seedAdmin()
  .then(() => {
    console.log('Admin seed completed');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`Admin seed failed: ${error.message}`);
    await mongoose.connection.close();
    process.exit(1);
  });
