import type { SQLiteDatabase } from 'expo-sqlite';

import type { User } from '@/types/auth';

export interface UserCredentialsRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
}

// Finds a user together with their stored password hash by email.
export async function findUserCredentials(
  db: SQLiteDatabase,
  email: string,
): Promise<UserCredentialsRow | null> {
  return db.getFirstAsync<UserCredentialsRow>(
    'SELECT id, name, email, password_hash, password_salt FROM users WHERE email = ?',
    [email],
  );
}

// Finds a user by id without exposing password data.
export async function findUserById(db: SQLiteDatabase, id: number): Promise<User | null> {
  return db.getFirstAsync<User>('SELECT id, name, email FROM users WHERE id = ?', [id]);
}

// Inserts a new user with an already hashed password and returns the new id.
export async function insertUser(
  db: SQLiteDatabase,
  name: string,
  email: string,
  passwordHash: string,
  passwordSalt: string,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO users (name, email, password_hash, password_salt) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, passwordSalt],
  );
  return result.lastInsertRowId;
}
