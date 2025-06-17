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
- `pnpm run test` - Run tests with Vitest

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

### Ports example

```typescript
// src/core/domain/post/ports/postRepository.ts

export interface PostRepository {
  create(post: CreatePostParams): Promise<Result<Post, RepositoryError>>;
  getById(id: string): Promise<Result<Post, RepositoryError>>;
  // Other repository methods...
}
```

### Adapters example

```typescript
// src/core/adapters/drizzleSqlite/postRepository.ts

import type { Result } from "neverthrow";
import type { PostRepository } from "@/domain/post/ports/postRepository";
import type { CreatePostParams, Post } from "@/domain/post/types";
import type { Database } from "./database";

export class DrizzleSqlitePostRepository implements PostRepository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<Result<Post, RepositoryError>> {
    // Implementation using Drizzle ORM
  }

  async update(post: UpdatePostParams): Promise<Result<Post, RepositoryError>> {
    // Implementation using Drizzle ORM
  }
}
```

### Application Service example

```typescript
// src/core/application/post/updatePost.ts

import type { Context } from "../context";
import type { PostRepository } from "@/domain/post/ports/postRepository";
import { Result } from "neverthrow";

export async function editPost(
  context: Context,
  params: EditPostInput
): Promise<Result<Post, RepositoryError>> {
  return context.postRepository.update(params).mapErr(error => new ApplicationError("Failed to update post", error));
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

- All backend functions return `Result<T, E>` or `Promise<Result<T, E>>` types using `neverthrow`
- Each modules has its own error types, e.g. `RepositoryError`, `ApplicationError`. Error types should extend a base `AnyError` class (`src/lib/errors.ts`)

## Testing

- Create tests that validate formal method models
- Use `pnpm run test` for tests
- Use `src/core/adapters/mock/${adapter}.ts` to create mock implementations of external services for testing

### Application Service Tests

- Use `src/core/application/${domain}/${usecase}.test.ts` for unit tests of application services
