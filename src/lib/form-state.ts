export type FormState = {
  resetKey?: number;
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
  tripId?: string;
};
export type FormAction = (state: FormState, form: FormData) => Promise<FormState>;
