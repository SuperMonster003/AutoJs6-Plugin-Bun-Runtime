"bun";

// Bun strips TypeScript types at runtime, so no separate compile step is needed.
type TaskState = "pending" | "done";

interface Task {
  readonly title: string;
  state: TaskState;
}

const tasks: readonly Task[] = [
  { title: "Install Bun Runtime", state: "done" },
  { title: "Run a TypeScript file", state: "pending" },
];

const completed = tasks.filter((task) => task.state === "done").length;
console.log(`Completed ${completed} of ${tasks.length} typed tasks`);
