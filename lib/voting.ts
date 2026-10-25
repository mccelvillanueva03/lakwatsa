import { UserError } from "./validation";
export function leaders(options: string[], votes: (string | null)[]) {
  const counts = options.map((id) => ({
    id,
    count: votes.filter((v) => v === id).length,
  }));
  const max = Math.max(0, ...counts.map((v) => v.count));
  return max === 0
    ? []
    : counts.filter((v) => v.count === max).map((v) => v.id);
}
export function chooseWinner(
  options: string[],
  votes: (string | null)[],
  choice?: string,
) {
  const top = leaders(options, votes);
  if (top.length === 1) return top[0];
  if (choice && (top.length ? top : options).includes(choice)) return choice;
  throw new UserError(
    "Resolve every tied or unvoted category before finalizing.",
    "choices",
  );
}
