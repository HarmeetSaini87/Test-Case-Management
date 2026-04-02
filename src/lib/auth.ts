import fs from 'fs';
import path from 'path';

export interface User {
  username: string;
  email?: string;
  passwordHash: string;
  role: 'admin' | 'tester';
}

function getUsersPath() {
  const dataPath = path.join(process.cwd(), "dataHub");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return path.join(dataPath, "users.json");
}

export function getAllUsers(): User[] {
  const filePath = getUsersPath();
  if (!fs.existsSync(filePath)) {
    // Scaffold default admin
    const defaultAdmin: User[] = [{
      username: 'admin',
      passwordHash: 'admin', // In production, use bcrypt. Keeping plain string for local MVP
      role: 'admin'
    }];
    fs.writeFileSync(filePath, JSON.stringify(defaultAdmin, null, 2), 'utf-8');
    return defaultAdmin;
  }
  
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

export function saveAllUsers(users: User[]) {
  const filePath = getUsersPath();
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
}
