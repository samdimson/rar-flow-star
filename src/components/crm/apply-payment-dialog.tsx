import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currencyExact, todayIso } from "@/lib/crm/format";
import { LeadIdentityHeader } from "@/components/crm/lead-identity-header";

const KINDS = ["deductible", "acv", "depreciation", "supplement", "other"] as const;
type Kind = (typeof KINDS)[number];

export function ApplyPaymentDialog({
  leadId,
  invoiceId,
  invoiceAmount,
  alreadyCollected,
  leadNumber,
  customerName,
  address,
}: {
  leadId: string;
  invoiceId: string;
  invoiceAmount: number;
  alreadyCollected: number;
  leadNumber?: string | null;
  customerName?: string | null;
  address?: string | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<Kind>("acv");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayIso());
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  const balance = Math.max(Number(invoiceAmount) - alreadyCollected, 0);

  const apply = async () => {
    const value = Number(String(amount).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a payment amount greater than zero");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("payments").insert({
        lead_id: leadId,
        invoice_id: invoiceId,
        amount: value,
        kind,
        received_at: receivedAt || todayIso(),
        method: method || null,
        reference: reference || null,
      });
      if (error) throw error;

      const { data: allPayments, error: sumError } = await supabase
        .from("payments")
        .select("amount")
        .eq("lead_id", leadId);
      if (sumError) throw sumError;
      const collected = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

      if (collected >= Number(invoiceAmount)) {
        const { error: invError } = await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
        if (invError) throw invError;
      }

      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries();

      toast.success(`Payment of ${currencyExact(value)} applied`);
      setAmount("");
      setMethod("");
      setReference("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="!bg-green-600 hover:!bg-green-700 !text-white">
          Apply Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <LeadIdentityHeader leadNumber={leadNumber} customerName={customerName} address={address} />
            <span className="mt-1 block text-base">Apply Payment</span>
          </DialogTitle>
          <DialogDescription>
            Balance due {currencyExact(balance)} of {currencyExact(Number(invoiceAmount))}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Payment type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger aria-label="Payment type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k === "acv" ? "ACV" : k.charAt(0).toUpperCase() + k.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount ($)</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Received date</Label>
            <Input id="pay-date" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-method">Method</Label>
            <Input
              id="pay-method"
              placeholder="check, wire, ACH…"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-reference">Reference / check #</Label>
            <Input id="pay-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void apply()} disabled={saving}>
            {saving ? "Applying…" : "Apply Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
