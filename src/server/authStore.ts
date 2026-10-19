import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface UserSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface SyncedUserData {
  userId: string;
  history?: any[];
  favorites?: any[];
  settings?: Record<string, any>;
  updatedAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const USERDATA_FILE = path.join(DATA_DIR, 'userdata.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

function readJsonFile<T>(filePath: string, defaultVal: T): T {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.warn(`Could not read ${filePath}, returning default`, err);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export class AuthStore {
  private users: UserRecord[];
  private sessions: UserSession[];
  private userData: Record<string, SyncedUserData>;

  constructor() {
    this.users = readJsonFile<UserRecord[]>(USERS_FILE, []);
    this.sessions = readJsonFile<UserSession[]>(SESSIONS_FILE, []);
    this.userData = readJsonFile<Record<string, SyncedUserData>>(USERDATA_FILE, {});
  }

  public register(name: string, email: string, password: string): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; token: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.users.find(u => u.email === normalizedEmail);
    if (existing) {
      throw new Error('Email already registered');
    }

    if (!name || name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const id = 'usr_' + crypto.randomUUID();
    const newUser: UserRecord = {
      id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      salt,
      createdAt: Date.now(),
    };

    this.users.push(newUser);
    writeJsonFile(USERS_FILE, this.users);

    const token = this.createSession(newUser.id);
    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      token,
    };
  }

  public login(email: string, password: string): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; token: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email === normalizedEmail);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const expectedHash = hashPassword(password, user.salt);
    if (expectedHash !== user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const token = this.createSession(user.id);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  public createSession(userId: string): string {
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      token,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    // Clean expired sessions
    this.sessions = this.sessions.filter(s => s.expiresAt > Date.now());
    this.sessions.push(session);
    writeJsonFile(SESSIONS_FILE, this.sessions);

    return token;
  }

  public getUserFromToken(token: string): Omit<UserRecord, 'passwordHash' | 'salt'> | null {
    if (!token) return null;
    const session = this.sessions.find(s => s.token === token && s.expiresAt > Date.now());
    if (!session) return null;

    const user = this.users.find(u => u.id === session.userId);
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  public logout(token: string): boolean {
    const index = this.sessions.findIndex(s => s.token === token);
    if (index !== -1) {
      this.sessions.splice(index, 1);
      writeJsonFile(SESSIONS_FILE, this.sessions);
      return true;
    }
    return false;
  }

  public saveUserData(userId: string, data: { history?: any[]; favorites?: any[]; settings?: Record<string, any> }): SyncedUserData {
    const existing = this.userData[userId] || { userId, updatedAt: Date.now() };
    const updated: SyncedUserData = {
      ...existing,
      ...(data.history !== undefined ? { history: data.history } : {}),
      ...(data.favorites !== undefined ? { favorites: data.favorites } : {}),
      ...(data.settings !== undefined ? { settings: { ...(existing.settings || {}), ...data.settings } } : {}),
      userId,
      updatedAt: Date.now(),
    };

    this.userData[userId] = updated;
    writeJsonFile(USERDATA_FILE, this.userData);
    return updated;
  }

  public getUserData(userId: string): SyncedUserData | null {
    return this.userData[userId] || null;
  }
}

export const authStore = new AuthStore();
