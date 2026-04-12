"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  reportId: string;
  defaultEmail: string;
  defaultSubject: string;
  defaultMessage: string;
  onSent: () => void;
}

export function SendModal({ open, onClose, reportId, defaultEmail, defaultSubject, defaultMessage, onSent }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${reportId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Send failed");
      }
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Send Report via Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="glass-card border-white/10 text-white" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="glass-card border-white/10 text-white" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="glass-card border-white/10 text-white min-h-[100px]" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button onClick={handleSend} disabled={sending} className="w-full bg-vo360-orange hover:bg-vo360-orange/90 text-white font-bold">
            {sending ? "Sending..." : "Send Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
