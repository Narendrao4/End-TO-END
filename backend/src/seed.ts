import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User, Friendship } from './models';

async function seed() {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Friendship.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await User.create({
    username: 'alice',
    email: 'alice@example.com',
    passwordHash,
    bio: 'Hey there! I am Alice.',
  });

  const bob = await User.create({
    username: 'bob',
    email: 'bob@example.com',
    passwordHash,
    bio: 'Bob here.',
  });

  const charlie = await User.create({
    username: 'charlie',
    email: 'charlie@example.com',
    passwordHash,
    bio: 'Charlie checking in.',
  });

  // Make alice and bob friends
  await Friendship.create({
    users: [alice._id, bob._id],
  });

  console.log('Seed data created:');
  console.log('  alice@example.com / password123');
  console.log('  bob@example.com / password123');
  console.log('  charlie@example.com / password123');
  console.log('  Alice and Bob are friends');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
