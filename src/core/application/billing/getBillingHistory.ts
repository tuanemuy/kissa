import type { BillingEvent } from "@/core/domain/billing/types";
import { userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const getBillingHistoryInputSchema = z.object({
  userId: userIdSchema,
  pagination: z
    .object({
      page: z.number().positive().default(1),
      limit: z.number().positive().max(100).default(20),
    })
    .default(() => ({ page: 1, limit: 20 })),
  filter: z
    .object({
      fromDate: z.date().optional(),
      toDate: z.date().optional(),
    })
    .default({}),
});
export type GetBillingHistoryInput = z.infer<
  typeof getBillingHistoryInputSchema
>;

export type GetBillingHistoryResult = {
  items: BillingEvent[];
  count: number;
  totalSpent: number;
};

export async function getBillingHistory(
  context: Context,
  input: GetBillingHistoryInput,
): Promise<Result<GetBillingHistoryResult, ApplicationError>> {
  const parseResult = validate(getBillingHistoryInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid billing history input", parseResult.error),
    );
  }

  const { userId, pagination, filter } = parseResult.value;

  // Check if user exists
  const userResult = await context.userRepository.findById(userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to get user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Get billing events
  const listResult = await context.billingRepository.list({
    pagination,
    filter: {
      userId,
      ...filter,
    },
  });

  if (listResult.isErr()) {
    return err(
      new ApplicationError("Failed to get billing history", listResult.error),
    );
  }

  // Calculate total spent
  const totalSpentResult = await context.billingRepository.calculateTotalSpent(
    userId,
    filter.fromDate,
    filter.toDate,
  );

  if (totalSpentResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to calculate total spent",
        totalSpentResult.error,
      ),
    );
  }

  return ok({
    items: listResult.value.items,
    count: listResult.value.count,
    totalSpent: totalSpentResult.value,
  });
}
