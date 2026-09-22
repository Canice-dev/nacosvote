"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { AdminSidebar } from "@/components/admin-sidebar";
import { SiteHeader } from "@/components/site-header";

type Election = { id: string; title: string; state: "draft" | "scheduled" | "open" | "closed" | "published" };
type SourceElection = Election & { voterCount: number };
type Admin = { username: string; email: string; role: "super_admin" | "manager" | "observer" };

export function VoterRegisterManager({ admin, elections }: { admin: Admin; elections: Election[] }) {
  const editable = elections.filter((election) => election.state === "draft" || election.state === "scheduled");
  const [electionId, setElectionId] = useState(editable[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [sources, setSources] = useState<SourceElection[]>([]);
  const [sourceElectionId, setSourceElectionId] = useState("");
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const canImport = admin.role === "manager" || admin.role === "super_admin";

  useEffect(() => {
    if (!canImport || !electionId) return;
    let active = true;
    fetch(`/api/admin/elections/${electionId}/voter-register`)
      .then(async (response) => ({ response, result: await response.json() as { sourceElections?: SourceElection[] } }))
      .then(({ response, result }) => {
        if (!active || !response.ok) return;
        const availableSources = result.sourceElections ?? [];
        setSources(availableSources);
        setSourceElectionId(availableSources[0]?.id ?? "");
      })
      .catch(() => active && setSources([]));
    return () => { active = false; };
  }, [canImport, electionId]);

  async function importVoters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!electionId || !file) { setMessage("Select an election and choose a CSV file."); return; }
    setIsSubmitting(true); setMessage(undefined);
    try {
      const formData = new FormData(); formData.set("file", file);
      const response = await fetch(`/api/admin/elections/${electionId}/voter-register/import`, { method: "POST", body: formData });
      const result: { importedCount?: number; message?: string } = await response.json();
      if (!response.ok) { setMessage(result.message ?? "Unable to import voters."); return; }
      setMessage(`${result.importedCount ?? 0} voters were imported successfully.`);
      setFile(null); if (fileInput.current) fileInput.current.value = "";
    } catch { setMessage("Unable to import voters. Check your connection and try again."); }
    finally { setIsSubmitting(false); }
  }

  async function reuseRegister() {
    if (!electionId || !sourceElectionId) { setMessage("Select a previous election to reuse its register."); return; }
    setIsSubmitting(true); setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/elections/${electionId}/voter-register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceElectionId }) });
      const result: { copiedCount?: number; message?: string } = await response.json();
      if (!response.ok) { setMessage(result.message ?? "Unable to reuse the voter register."); return; }
      setMessage(`${result.copiedCount ?? 0} voters were copied into this election.`);
      setSources([]); setSourceElectionId("");
    } catch { setMessage("Unable to reuse the voter register. Check your connection and try again."); }
    finally { setIsSubmitting(false); }
  }

  return <main className="min-h-screen bg-[#fbfbfa] text-[#282a2a]">
    <AdminSidebar {...admin} initials={admin.username.slice(0, 2).toUpperCase()} />
    <div className="lg:pl-67"><SiteHeader className="h-18.25 border-b border-[#e6e6e3] bg-white px-5 pl-17 sm:px-8 lg:px-12" />
      <section className="mx-auto max-w-330 px-5 py-9 sm:px-8 lg:px-12">
        <div className="border-b border-[#e5e6e2] pb-7"><p className="text-sm font-medium text-[#707773]">Voter register</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#292d2b] sm:text-[34px]">Eligible voters</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#727975]">Upload a new CSV or reuse a previous register before the election opens.</p></div>
        {!canImport ? <p className="mt-7 rounded-md border border-[#f1d5cb] bg-[#fff8f5] p-4 text-sm text-[#8c3829]">Observers cannot import voter registers.</p> : editable.length === 0 ? <p className="mt-7 rounded-md border border-dashed border-[#cfdad5] bg-white p-6 text-sm text-[#5c6762]">Create a draft or scheduled election before managing voters.</p> : <div className="mt-7 grid max-w-4xl gap-6 lg:grid-cols-2">
          <form onSubmit={importVoters} className="rounded-xl border border-[#dfe5e1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-[#39413e]">Import CSV</h2><p className="mt-1 text-sm leading-6 text-[#727975]">Required columns: matric_number, full_name, school_email, and level.</p><ElectionSelect elections={editable} value={electionId} onChange={setElectionId} /><label className="mt-5 block text-sm font-semibold text-[#39413e]" htmlFor="voter-file">CSV file</label><input ref={fileInput} id="voter-file" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm text-[#5c6762] file:mr-4 file:rounded-md file:border-0 file:bg-[#edf8f3] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#176353]" /><button disabled={isSubmitting} type="submit" className="mt-6 rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? "Working..." : "Import voters"}</button></form>
          <div className="rounded-xl border border-[#dfe5e1] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-[#39413e]">Reuse previous register</h2><p className="mt-1 text-sm leading-6 text-[#727975]">Copies eligible voters into the selected election and resets their voting state. Previous records stay unchanged.</p><ElectionSelect elections={editable} value={electionId} onChange={setElectionId} id="reuse-election" /><label className="mt-5 block text-sm font-semibold text-[#39413e]" htmlFor="source-election">Previous election</label><select id="source-election" value={sourceElectionId} onChange={(event) => setSourceElectionId(event.target.value)} disabled={!sources.length || isSubmitting} className="mt-2 h-11 w-full rounded-md border border-[#cfdad5] bg-white px-3 text-sm disabled:bg-[#f4f6f5]"><option value="">{sources.length ? "Select a register" : "No previous registers available"}</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.title} — {source.voterCount} voters</option>)}</select><button disabled={isSubmitting || !sourceElectionId} onClick={reuseRegister} type="button" className="mt-6 rounded-md bg-[#0f5a50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? "Working..." : "Reuse register"}</button></div>
        </div>}
        {message && <p role="status" className="mt-5 max-w-4xl rounded-md bg-[#edf8f3] px-3 py-2.5 text-sm text-[#176353]">{message}</p>}
      </section></div>
  </main>;
}

function ElectionSelect({ elections, value, onChange, id = "voter-election" }: { elections: Election[]; value: string; onChange: (value: string) => void; id?: string }) {
  return <><label className="mt-5 block text-sm font-semibold text-[#39413e]" htmlFor={id}>Target election</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#cfdad5] bg-white px-3 text-sm">{elections.map((election) => <option key={election.id} value={election.id}>{election.title} ({election.state})</option>)}</select></>;
}
