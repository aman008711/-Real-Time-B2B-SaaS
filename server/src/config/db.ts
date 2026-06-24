import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ [Database] MongoDB connection established successfully');
  } catch (error) {
    console.error('❌ [Database] MongoDB connection failed:', error);
    process.exit(1);
  }
}
