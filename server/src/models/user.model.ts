import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role?: 'admin' | 'member';
}

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  create(user: CreateUserInput): Promise<IUser>;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  createdAt: { type: Date, default: Date.now }
});

// Configure toJSON options to strip passwordHash and convert _id to id string representation
UserSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  }
});

export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return UserModel.findById(id).exec();
  }

  async create(input: CreateUserInput): Promise<IUser> {
    const user = new UserModel({
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      name: input.name,
      role: input.role || 'member',
    });
    return user.save();
  }
}

export const userRepository: IUserRepository = new MongoUserRepository();