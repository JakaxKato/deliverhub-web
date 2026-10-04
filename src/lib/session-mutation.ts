"use client";

import { type MutationFunction, type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { assertSessionIdentity, getSessionIdentity } from "./session-cache";

export function useSessionMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    mutationFn: MutationFunction<TData, TVariables>;
  },
) {
  const [identity] = useState(getSessionIdentity);
  return useMutation({
    ...options,
    mutationFn: (variables, context) => {
      // A retained callback/draft belongs to the session that mounted its component.
      assertSessionIdentity(identity);
      return options.mutationFn(variables, context);
    },
  });
}
