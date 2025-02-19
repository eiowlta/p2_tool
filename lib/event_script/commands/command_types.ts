import * as arg from "./arg_types";

/**
 * null means the argument is a dummy, used for reserving data usually
 */
export interface Command {
  args: (arg.ArgType | null)[];
  variants?: Record<string, (arg.ArgType|null)[]>
}
