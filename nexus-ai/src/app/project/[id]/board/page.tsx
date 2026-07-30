import { KanbanSquare } from "lucide-react";

type BoardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;
  const columns = [
    { label: "Todo", tasks: ["Chốt workspace contract", "Thiết kế onboarding"] },
    { label: "Doing", tasks: ["Chuẩn hóa RAG schema"] },
    { label: "Done", tasks: ["PM Dashboard MVP"] },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <KanbanSquare aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Project · {id}
            </p>
            <h1 className="text-2xl font-bold text-slate-950">Kanban Board</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Shell mock để route không 404. Dev Kanban sẽ thay bằng CRUD + drag-drop theo contract `tasks`.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <section className="rounded-lg border bg-white p-4 shadow-sm" key={column.label}>
            <h2 className="font-semibold text-slate-950">{column.label}</h2>
            <div className="mt-4 space-y-3">
              {column.tasks.map((task) => (
                <article className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700" key={task}>
                  {task}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
