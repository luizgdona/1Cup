import pino from 'pino';

const logger = pino({ name: 'background' });

/** Detached work still in flight, awaited by drainBackgroundTasks() on shutdown. */
const inFlight = new Set<Promise<void>>();

/**
 * Runs `work` off the response path and returns immediately.
 *
 * Used where the amount of work is itself secret-dependent: doing it inline
 * makes the response measurably slower for one branch than the other. The
 * caller gets a uniform, fast response and the work happens after.
 *
 * The promise is tracked so shutdown can wait for it. Failures are logged here
 * and never propagate — there is no caller left to receive them.
 */
export function runDetached(name: string, work: () => Promise<unknown>): void {
  let started: Promise<unknown>;

  // Invoked synchronously so the work actually begins now rather than a
  // microtask later, and so it is registered before control returns to the
  // caller. A synchronous throw is caught here rather than escaping to a
  // caller that has already moved on.
  try {
    started = Promise.resolve(work());
  } catch (err) {
    logger.error({ err, task: name }, 'tarefa em background falhou ao iniciar');
    return;
  }

  const task = started
    .then(
      () => {},
      (err) => {
        logger.error({ err, task: name }, 'tarefa em background falhou');
      }
    )
    .finally(() => {
      inFlight.delete(task);
    });

  inFlight.add(task);
}

/** Number of detached tasks still in flight. Exposed for tests and shutdown logging. */
export function pendingBackgroundTasks(): number {
  return inFlight.size;
}

/**
 * Waits for in-flight detached work, bounded by `timeoutMs`.
 *
 * Called during shutdown so SIGTERM does not kill the process mid-write or
 * mid-SMTP-handshake — a dropped verification email leaves a user stuck behind
 * the `requireVerified` gate. Bounded on purpose: a hung task must not hold a
 * deploy open indefinitely, so past the deadline we accept the loss.
 *
 * Best-effort, not durable: a hard crash still loses the work. A queue
 * (BullMQ/Redis) is the next step if that ever needs to be a guarantee.
 */
export async function drainBackgroundTasks(timeoutMs = 5_000): Promise<void> {
  if (inFlight.size === 0) return;

  logger.info({ pending: inFlight.size }, 'aguardando tarefas em background');

  await Promise.race([
    Promise.allSettled([...inFlight]),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        if (inFlight.size > 0) {
          logger.warn({ pending: inFlight.size }, 'encerrando com tarefas em background pendentes');
        }
        resolve();
      }, timeoutMs);
    }),
  ]);
}
