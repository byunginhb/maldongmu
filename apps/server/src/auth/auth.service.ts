import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { nanoid } from "nanoid";
import { DbService } from "../db/db.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly dbs: DbService,
    private readonly jwt: JwtService,
  ) {}

  createGuest() {
    const id = `guest_${nanoid(16)}`;
    this.dbs.db.prepare(`INSERT INTO users (id, type) VALUES (?, 'guest')`).run(id);
    const token = this.jwt.sign({ sub: id, type: "guest" });
    return { token, userId: id, type: "guest" };
  }

  me(userId: string) {
    const user = this.dbs.db
      .prepare(`SELECT id, type, nickname, created_at as createdAt FROM users WHERE id = ?`)
      .get(userId) as any;
    if (!user) return null;
    const convCount = (
      this.dbs.db.prepare(`SELECT COUNT(*) as c FROM conversations WHERE user_id = ?`).get(userId) as any
    ).c;
    return { ...user, conversationCount: convCount, guestLimit: Number(process.env.GUEST_CONVERSATION_LIMIT || 3) };
  }

  userExists(userId: string): boolean {
    return !!this.dbs.db.prepare(`SELECT 1 FROM users WHERE id = ?`).get(userId);
  }

  verify(token: string): { sub: string } | null {
    try {
      return this.jwt.verify<{ sub: string }>(token);
    } catch {
      return null;
    }
  }
}
