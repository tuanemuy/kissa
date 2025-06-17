# コンテキストオブジェクト生成方法の改善

## タスク

- `src/actions/context.ts` の `getDb` は不要。設定全般を取得する汎用的な処理にする

## 例

```typescript
export const envSchema = z.object({
  TURSO_DATABASE_URL: z.string(),
  TURSO_AUTH_TOKEN: z.string(),
  // Other environment variables...
});

export type Env = z.infer<typeof envSchema>;

const env = envSchema.safeParse(process.env);
if (!env.success) {
  throw new Error(/* Zod errors */);
}

const db = getDatabase(env.data.TURSO_DATABASE_URL, env.data.TURSO_AUTH_TOKEN);

export const context = {
  userRepository: new DrizzleTursoUserRepository(db),
  passwordHasher: new BcryptPasswordHasher(),
  // Ohter adapters...
};
```
