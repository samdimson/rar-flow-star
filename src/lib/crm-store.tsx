import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  seedActivities,
  seedLeads,
  type Activity,
  type Lead,
  type Stage,
} from "./crm-data";

type NewLead = Omit<Lead, "id" | "createdAt" | "lastActivity">;

type CrmContextValue = {
  leads: Lead[];
  activities: Activity[];
  addLead: (lead: NewLead) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  moveLead: (id: string, stage: Stage) => void;
  logActivity: (activity: Omit<Activity, "id" | "at">) => void;
};

const CrmContext = createContext<CrmContextValue | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [activities, setActivities] = useState<Activity[]>(seedActivities);

  const logActivity = useCallback((activity: Omit<Activity, "id" | "at">) => {
    setActivities((prev) => [
      { ...activity, id: `A-${Math.random().toString(36).slice(2, 8)}`, at: today() },
      ...prev,
    ]);
  }, []);

  const addLead = useCallback(
    (lead: NewLead) => {
      const id = `L-${1051 + Math.floor(Math.random() * 8000)}`;
      setLeads((prev) => [
        { ...lead, id, createdAt: today(), lastActivity: today() },
        ...prev,
      ]);
      logActivity({ leadId: id, type: "note", summary: `Lead created — ${lead.company}` });
    },
    [logActivity],
  );

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch, lastActivity: today() } : l)),
    );
  }, []);

  const moveLead = useCallback(
    (id: string, stage: Stage) => {
      setLeads((prev) => {
        const lead = prev.find((l) => l.id === id);
        if (!lead || lead.stage === stage) return prev;
        return prev.map((l) =>
          l.id === id ? { ...l, stage, lastActivity: today() } : l,
        );
      });
      logActivity({ leadId: id, type: "stage", summary: `Stage changed to ${stage}` });
    },
    [logActivity],
  );

  const value = useMemo(
    () => ({ leads, activities, addLead, updateLead, moveLead, logActivity }),
    [leads, activities, addLead, updateLead, moveLead, logActivity],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
}
