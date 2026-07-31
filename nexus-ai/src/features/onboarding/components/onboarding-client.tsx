"use client";

import { useActionState, useState } from "react";

import type { EQProfile } from "../types";
import { completeOnboarding } from "../actions";
import { CVUploader } from "./cv-uploader";
import { EQTestModal } from "./eq-test-modal";

const initialState: { error?: string } = {};

export function OnboardingClient({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [rawCV, setRawCV] = useState("");
  const [eqAnswers, setEqAnswers] = useState<EQProfile | null>(null);
  const [eqOpen, setEqOpen] = useState(false);
  const [state, action, pending] = useActionState(completeOnboarding, initialState);

  return (
    <section className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            Tên hiển thị
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              onChange={(event) => setName(event.target.value)}
              placeholder="Nguyễn Văn A"
              required
              value={name}
            />
          </label>
        </div>

        <CVUploader
          onNextStep={() => setEqOpen(true)}
          onProfileExtracted={(nextSkills, nextRawCV) => {
            setSkills(nextSkills);
            setRawCV(nextRawCV);
          }}
        />
      </div>

      <aside className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Onboarding status</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Hoàn thiện hồ sơ</h2>
        </div>
        <StatusRow done={Boolean(name)} label="Tên hiển thị" />
        <StatusRow done={skills.length > 0} label={`${skills.length} kỹ năng`} />
        <StatusRow done={Boolean(rawCV)} label="CV đã phân tích" />
        <StatusRow done={Boolean(eqAnswers)} label="EQ survey" />

        <button
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={() => setEqOpen(true)}
          type="button"
        >
          {eqAnswers ? "Làm lại EQ" : "Làm EQ survey"}
        </button>

        <form action={action} className="space-y-3">
          <input name="next" type="hidden" value={next} />
          <input name="name" type="hidden" value={name} />
          <input name="skills" type="hidden" value={JSON.stringify(skills)} />
          <input name="rawCV" type="hidden" value={rawCV} />
          <input name="eqAnswers" type="hidden" value={JSON.stringify(eqAnswers ?? {})} />
          {state.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
          <button
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={pending || !name || !rawCV || skills.length === 0 || !eqAnswers}
            type="submit"
          >
            {pending ? "Đang lưu..." : "Hoàn tất onboarding"}
          </button>
        </form>
      </aside>

      <EQTestModal
        isOpen={eqOpen}
        onClose={() => setEqOpen(false)}
        onSubmitEQ={(data) => {
          setEqAnswers(data);
          setEqOpen(false);
        }}
      />
    </section>
  );
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={done ? "font-bold text-emerald-700" : "font-bold text-slate-400"}>
        {done ? "Done" : "Pending"}
      </span>
    </div>
  );
}
