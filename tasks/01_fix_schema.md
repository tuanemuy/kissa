# データベーススキーマの修正

## タスク

- idにはUUID v7を使用する
- id, createdAt, updatedAtには基本的にパラメータを渡さず、自動で生成されるようにする

## 例

```typescript
import { v7 as uuidv7 } from 'uuid';

export const entities = sqliteTable("entities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  // ...
```
