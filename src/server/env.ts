import { z } from "zod";

/**
 * Validated process environment. Imported by web and worker.
 * Validation is lazy (first property access) so `next build` can analyze modules without a full
 * runtime environment; at runtime a missing variable fails fast on first use with a clear message.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3100"),
  APP_TIMEZONE: z.string().default("Europe/Berlin"),
  DEFAULT_LOCALE: z.enum(["de", "en"]).default("de"),
  /**
   * Comma-separated e-mail addresses of the operator(s). Operators create communities on /operator;
   * the seed makes sure each of them has an active account to sign in with.
   */
  OPERATOR_EMAILS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),

  BETTER_AUTH_SECRET: z.string().min(16),
  APP_ENCRYPTION_KEY: z.string().min(16),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6380"),
  UPLOAD_DIR: z.string().default("./data/uploads"),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1026),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("AI-Up Kurse <noreply@ai-up.club>"),

  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

function load(): Env {
  if (cached) return cached;
  // Coolify and docker compose pass variables without a value as empty strings rather than leaving
  // them out. Drop those so `.optional()` and `.default()` behave as intended.
  const present = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(present);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    return load()[prop as keyof Env];
  },
  has(_target, prop) {
    return prop in load();
  },
  ownKeys() {
    return Reflect.ownKeys(load());
  },
  getOwnPropertyDescriptor(_target, prop) {
    const value = load()[prop as keyof Env];
    return value === undefined ? undefined : { value, enumerable: true, configurable: true, writable: false };
  },
});

export const isProd = () => env.NODE_ENV === "production";

export function isOperatorEmail(email: string): boolean {
  return env.OPERATOR_EMAILS.includes(email.trim().toLowerCase());
}
