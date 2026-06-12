export interface User {
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
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: CreateUserInput): Promise<User>;
}

class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findByEmail(email: string): Promise<User | null> {
    const emailLower = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase().trim() === emailLower) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const id = Math.random().toString(36).substring(2, 15);
    const newUser: User = {
      id,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      name: input.name,
      role: input.role || 'member',
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }
}

export const userRepository: IUserRepository = new InMemoryUserRepository();
