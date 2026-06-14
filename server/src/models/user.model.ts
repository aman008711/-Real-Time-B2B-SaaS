import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "users.json");

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "admin" | "member";
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role?: "admin" | "member";
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: CreateUserInput): Promise<User>;
}

class InMemoryUserRepository implements IUserRepository {
  private loadUsers(): Map<string, User> {
    if (!fs.existsSync(FILE_PATH)) {
      return new Map();
    }

    const fileData = fs.readFileSync(FILE_PATH, "utf-8");

    if (!fileData) {
      return new Map();
    }

    const parsed = JSON.parse(fileData);

    return new Map(
      Object.entries(parsed).map(([id, user]: [string, any]) => [
        id,
        {
          ...user,
          createdAt: new Date(user.createdAt),
        },
      ])
    );
  }

  private saveUsers(users: Map<string, User>): void {
    const obj = Object.fromEntries(users);

    fs.writeFileSync(
      FILE_PATH,
      JSON.stringify(obj, null, 2),
      "utf-8"
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = this.loadUsers();

    const emailLower = email.toLowerCase().trim();

    for (const user of users.values()) {
      if (user.email.toLowerCase().trim() === emailLower) {
        return user;
      }
    }

    return null;
  }

  async findById(id: string): Promise<User | null> {
    const users = this.loadUsers();

    return users.get(id) || null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const users = this.loadUsers();

    const id = Math.random().toString(36).substring(2, 15);

    const newUser: User = {
      id,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      name: input.name,
      role: input.role || "member",
      createdAt: new Date(),
    };

    users.set(id, newUser);

    this.saveUsers(users);

    return newUser;
  }
}

export const userRepository: IUserRepository =
  new InMemoryUserRepository();