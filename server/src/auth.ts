import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export interface UserTokenPayload {
  kind: "user";
  userId: string;
  username: string;
  createdAt: string;
  exp: number;
}

export interface AdminTokenPayload {
  kind: "admin";
  exp: number;
}

export type TokenPayload = UserTokenPayload | AdminTokenPayload;

export function normalizeUsername(value: string): string {
  const username = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_@.-]{3,48}$/.test(username)) {
    throw httpError(
      400,
      "账号需要 3-48 位，可使用字母、数字、下划线、点、横线或 @，且不能包含空格。"
    );
  }
  return username;
}

export function assertPassword(password: string): void {
  if (typeof password !== "string" || password.length < 6 || password.length > 128) {
    throw httpError(400, "密码需要 6-128 位。");
  }
}

export function createPasswordRecord(password: string): {
  passwordHash: string;
  passwordSalt: string;
  passwordAlgo: string;
} {
  const passwordSalt = randomBytes(16).toString("hex");
  return {
    passwordHash: hashPassword(password, passwordSalt),
    passwordSalt,
    passwordAlgo: "scrypt"
  };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signToken(payload: TokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken<T extends TokenPayload>(token: string, secret: string): T {
  const [body, signature] = String(token ?? "").split(".");
  if (!body || !signature) {
    throw httpError(401, "登录凭证无效，请重新登录。");
  }
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEqual(signature, expected)) {
    throw httpError(401, "登录凭证无效，请重新登录。");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  if (!payload.exp || payload.exp < Date.now()) {
    throw httpError(401, "登录已过期，请重新登录。");
  }
  return payload;
}

export function createUserToken(input: {
  userId: string;
  username: string;
  createdAt: Date | string;
  secret: string;
}): string {
  return signToken(
    {
      kind: "user",
      userId: input.userId,
      username: input.username,
      createdAt: new Date(input.createdAt).toISOString(),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30
    },
    input.secret
  );
}

export function createAdminToken(secret: string): string {
  return signToken(
    {
      kind: "admin",
      exp: Date.now() + 1000 * 60 * 60 * 12
    },
    secret
  );
}

export function getBearerToken(authorization?: string): string {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  if (!match) {
    throw httpError(401, "请先登录。");
  }
  return match[1];
}

export function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
