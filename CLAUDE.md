# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design

- Define requirements in `docs/requirements.md`
- Model requirements in `spec/*` using formal methods
    - Perform structural modeling with Alloy
    - Describe dynamic system behavior with TLA+

## Development Commands

- `pnpm run lint` - Lint code with Biome
- `pnpm run lint:fix` - Lint code with Biome and fix issues
- `pnpm run format` - Format code with Biome
- `pnpm typecheck` - Type check code with tsc
- `pnpm run test` - Run tests with Vitest
- `pnpm alloy` - Run Alloy model checks
- `pnpm tlc` - Run TLA+ model checks

## Development Workflow

- Run `pnpm typecheck`, `pnpm run lint:fix` and `pnpm run format` after making changes to ensure code quality and consistency.
- Update `docs/progress.md` with current progress and any issues encountered.

## Backend Architecture

Hexagonal architecture with domain-driven design principles:

- **Domain Layer** (`src/core/domain/`): Contains business logic, types, and port interfaces
    - `src/core/domain/${domain}/types.ts`: Domain entities, value objects, and DTOs
    - `src/core/domain/${domain}/ports/**.ts`: Port interfaces for external services (repositories, exteranl APIs, etc.)
- **Adapter Layer** (`src/core/adapters/`): Contains concrete implementations for external services
    - `src/core/adapters/${externalService}/**.ts`: Adapters for external services like databases, APIs, etc.
- **Application Layer** (`src/core/application/`): Contains use cases and application services
    - `src/core/application/context.ts`: Context type for dependency injection
    - `src/core/application/${domain}/${usecase}.ts`: Application services that orchestrate domain logic. Each service is a function that takes a context object.

### Types example

```typescript
// src/core/domain/post/types.ts

import { z } from "zod/v4";
import { paginationSchema } from "@/lib/pagination.ts";

export const postIdSchema = z.uuid().brand("postId");
export type PostId = z.infer<typeof postIdSchema>;

export const postSchema = z.object({
  id: postIdSchema,
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Post = z.infer<typeof postSchema>;

// ...

export const listPostQuerySchema = z.object({
  pagination: paginationSchema,
  filter: z
    .object({
      text: z.string().optional(),
    })
    .optional(),
});
export type ListPostQuery = z.infer<typeof listPostQuerySchema>;
```

### Ports example

```typescript
// src/core/domain/post/ports/postRepository.ts

export interface PostRepository {
  create(post: CreatePostParams): ResultAsync<Post, RepositoryError>;
  list(query: ListPostQuery): ResultAsync<Post, RepositoryError>;
  // Other repository methods...
}
```

### Adapters example

```typescript
// src/core/adapters/drizzleSqlite/postRepository.ts

import type { ResultAsync } from "neverthrow";
import type { PostRepository } from "@/domain/post/ports/postRepository";
import { type CreatePostParams, type ListPostQuery, type Post, postSchema, } from "@/domain/post/types";
import type { Database } from "./database";

export class DrizzleSqlitePostRepository implements PostRepository {
  constructor(private readonly db: Database) {}

  async create(post: CreatePostParams): ResultAsync<Post, RepositoryError> {
    return ResultAsync.fromPromise(
      this.db.insert(posts).values(post).returning(),
      (error) => mapRepositoryError(error),
    ).andThen((results) =>
      validate(postSchema, results[0]).mapErr(
        (error) =>
          new RepositoryError(
            RepositoryErrorCode.DATA_ERROR,
            "Post validation failed",
            error,
          ),
      ),
    );
  }

  async list(query: ListPostQuery): ResultAsync<Post, RepositoryError> {
    const { pagination, filter } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const filters = [
      filter?.text ? like(posts.text, `%${filter.text}%`) : undefined,
    ].filter((filter) => filter !== undefined);

    return ResultAsync.fromPromise(
      Promise.all([
        this.db
          .select()
          .from(posts)
          .where(and(...filters))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)` })
          .from(posts)
          .where(and(...filters)),
      ]),
      (error) => mapRepositoryError(error),
    ).map(([items, countResult]) => ({
      items: items
        .map((item) => validate(postSchema, item).unwrapOr(null))
        .filter((item) => item !== null),
      count: Number(countResult[0].count),
    }));
  }
}
```

### Application Service example

```typescript
// src/core/application/post/createPost.ts

import { z } from "zod/v4";
import { ResultAsync } from "neverthrow";
import { validate } from "@/lib/validation.ts";
import type { PostRepository } from "@/domain/post/ports/postRepository";
import type { Context } from "../context";

export const createPostInputSchema = z.object({
  content: z.string().min(1).max(500),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export async function createPost(
  context: Context,
  input: CreatePostInput
): ResultAsync<Post, RepositoryError> {
  return validate(createPostInputSchema, input)
    .asyncAndThen((input) => context.postRepository.create(input).mapErr(error => new ApplicationError("Failed to create post", error)))
    .mapErr((error) => new ApplicationError("createPost", "Failed to create a new post", error));
}
```

## Frontend Architecture

Next.js 15.2.1 application code using:

- App Router
- React 19
- Tailwind CSS v4
- shadcn/ui

- UI Components
    - `src/app/components/ui/`: Reusable UI components using shadcn/ui
    - `src/app/components/${domain}/`: Domain-specific components
    - `src/app/components/**/*`: Other reusable components
- Pages and Routes
    - Follows Next.js App Router conventions
- Styles
    - `src/app/styles/index.css`: Entry point for global styles
- Server Actions
    - `src/actions/${domain}.ts`: Server actions for handling application services

## Tech Stack

- **Runtime**: Node.js 22.x
- **Frontend**: Next.js 15 with React 19, Tailwind CSS, shadcn/ui
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod 4 schemas with branded types
- **Error Handling**: neverthrow for Result types

## Error Handling

- All backend functions return `Result<T, E>` or `ResultAsync<T, E>` types using `neverthrow`
- Each modules has its own error types, e.g. `RepositoryError`, `ApplicationError`. Error types should extend a base `AnyError` class (`src/lib/errors.ts`)

## Testing

- Create tests that validate formal method models
- Use `pnpm test` for tests
- Use `src/core/adapters/mock/${adapter}.ts` to create mock implementations of external services for testing

### Application Service Tests

- Use `src/core/application/${domain}/${usecase}.test.ts` for unit tests of application services
