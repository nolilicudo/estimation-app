/**
 * BrochureModal
 * Captures name, email, phone and sends to Zapier → Go High Level email campaign.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, CheckCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface BrochureModalProps {
  open: boolean;
  onClose: () => void;
  /** Controls the title and copy shown in the modal */
  variant?: "decking" | "design-package";
}

export function BrochureModal({ open, onClose, variant = "decking" }: BrochureModalProps) {
  const isDesignPackage = variant === "design-package";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestBrochure = trpc.brochure.request.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    requestBrochure.mutate({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined });
  }

  function handleClose() {
    setName("");
    setEmail("");
    setPhone("");
    setSubmitted(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-700" />
            </div>
            <DialogTitle className="text-xl">
              {isDesignPackage ? "Get Your Free Design Guide" : "Get Your Free Brochure"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isDesignPackage
              ? "We'll send our full design services overview and project guide straight to your inbox."
              : "We'll send our full product catalog and design guide straight to your inbox."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <div>
              <p className="text-lg font-semibold text-charcoal">You're all set!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isDesignPackage
                  ? <>Your design guide is on its way to <strong>{email}</strong>. Check your inbox in a few minutes.</>
                  : <>Your brochure is on its way to <strong>{email}</strong>. Check your inbox in a few minutes.</>
                }
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="brochure-name">Full Name *</Label>
              <Input
                id="brochure-name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brochure-email">Email Address *</Label>
              <Input
                id="brochure-email"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brochure-phone">Phone Number (optional)</Label>
              <Input
                id="brochure-phone"
                type="tel"
                placeholder="(801) 555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={requestBrochure.isPending || !name.trim() || !email.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {requestBrochure.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
                ) : (
                  isDesignPackage ? "Send Me the Design Guide" : "Send Me a Brochure"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
