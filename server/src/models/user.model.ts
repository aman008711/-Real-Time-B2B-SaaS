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
  private writeQueue: Promise<void> = Promise.resolve();

  private async loadUsers(): Promise<Map<string, User>> {
    try {
      if (!fs.existsSync(FILE_PATH)) {
        return new Map();
      }

      const fileData = await fs.promises.readFile(FILE_PATH, "utf-8");

      if (!fileData.trim()) {
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
    } catch (error) {
      console.error("[UserRepository] Error loading users:", error);
      return new Map();
    }
  }

  private async saveUsers(users: Map<string, User>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            const obj = Object.fromEntries(users);
            await fs.promises.writeFile(
              FILE_PATH,
              JSON.stringify(obj, null, 2),
              "utf-8"
            );
            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.loadUsers();

    const emailLower = email.toLowerCase().trim();

    for (const user of users.values()) {
      if (user.email.toLowerCase().trim() === emailLower) {
        return user;
      }
    }

    return null;
  }

  async findById(id: string): Promise<User | null> {
    const users = await this.loadUsers();

    return users.get(id) || null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const users = await this.loadUsers();

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

    await this.saveUsers(users);

    return newUser;
  }
}

export const userRepository: IUserRepository =
  new InMemoryUserRepository();