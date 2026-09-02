/**
 * ContractSign — Virtual contract signing page
 * Accessible via /sign/:token (no login required)
 * Flow: View estimate summary → Upload 1–6 project photos → Read contract → Type name → Sign & Pay Deposit
 */
import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  FileText,
  CreditCard,
  Loader2,
  AlertCircle,
  PenLine,
  Camera,
  X,
  Upload,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const MAX_PHOTOS = 6;
const MIN_PHOTOS = 1;

interface UploadedPhoto {
  url: string;
  previewUrl: string;
  name: string;
}

export default function ContractSign() {
  const [, params] = useRoute("/sign/:token");
  const token = params?.token ?? "";

  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  // Photo upload state
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: req, isLoading, error } = trpc.sign.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const uploadPhotoMutation = trpc.sign.uploadPhoto.useMutation();

  const signMutation = trpc.sign.signAndPay.useMutation({
    onSuccess: (result) => {
      setSigned(true);
      if (result.checkoutUrl) {
        setTimeout(() => {
          window.location.href = result.checkoutUrl!;
        }, 2000);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Signing failed. Please try again.");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);

    if (files.length > remaining) {
      toast.warning(`You can upload up to ${MAX_PHOTOS} photos. Only the first ${remaining} will be added.`);
    }

    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        continue;
      }
      if (file.size > 16 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 16 MB).`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      setUploadingCount((c) => c + 1);

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data:image/...;base64, prefix
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/gif";
        const result = await uploadPhotoMutation.mutateAsync({
          token,
          fileBase64: base64,
          mimeType,
          fileName: file.name,
        });

        setPhotos((prev) => [
          ...prev,
          { url: result.url, previewUrl, name: file.name },
        ]);
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err?.message || "Unknown error"}`);
        URL.revokeObjectURL(previewUrl);
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSign = () => {
    if (photos.length < MIN_PHOTOS) {
      toast.error(`Please upload at least ${MIN_PHOTOS} photo of the project site before signing.`);
      return;
    }
    if (!signedName.trim()) {
      toast.error("Please type your full name to sign.");
      return;
    }
    if (!agreed) {
      toast.error("Please check the agreement box to continue.");
      return;
    }
    signMutation.mutate({
      token,
      signedName: signedName.trim(),
      origin: window.location.origin,
      photoUrls: photos.map((p) => p.url),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-canyon" />
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-charcoal mb-2">Link Not Found</h2>
            <p className="text-muted-foreground text-sm">
              {error?.message || "This signing link has expired or is invalid. Please contact us for a new link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (req.status === "signed" || signed) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-charcoal mb-2">Contract Signed!</h2>
            {req.status === "signed" ? (
              <p className="text-muted-foreground text-sm">
                This contract was already signed by <strong>{req.signedName}</strong>.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Thank you, <strong>{signedName}</strong>! Redirecting you to pay your deposit…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const grandTotal = Number(req.finalTotal);
  const depositAmount = Math.round(grandTotal * 0.5 * 100) / 100;
  const balanceAmount = Math.round((grandTotal - depositAmount) * 100) / 100;
  const isUploading = uploadingCount > 0;
  const canAddMore = photos.length < MAX_PHOTOS && !isUploading;

  return (
    <div className="min-h-screen bg-warm-cream py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-light text-charcoal tracking-wide">Review & Sign Your Contract</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Hi <strong>{req.customerName}</strong> — please review your estimate and sign below to proceed.
          </p>
        </div>

        {/* Estimate Summary */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-canyon">
              <FileText className="h-4 w-4" /> Project Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100">
                <tr><td className="py-2 text-muted-foreground w-36">Collection</td><td className="py-2 font-medium">{req.collectionName}</td></tr>
                <tr><td className="py-2 text-muted-foreground">Color</td><td className="py-2 font-medium">{req.colorName}</td></tr>
                <tr><td className="py-2 text-muted-foreground">Area</td><td className="py-2 font-medium">{req.sqft} sq ft</td></tr>
                <tr><td className="py-2 text-muted-foreground">Labor</td><td className="py-2 font-medium">{req.laborName}</td></tr>
                <tr><td className="py-2 text-muted-foreground">Delivery</td><td className="py-2 font-medium">{req.deliveryName}</td></tr>
                {req.customerAddress && <tr><td className="py-2 text-muted-foreground">Address</td><td className="py-2 font-medium">{req.customerAddress}</td></tr>}
              </tbody>
            </table>

            {req.showPricing === 1 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Project Total</span>
                    <span>{fmt(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700">
                    <span>50% Deposit Due Today</span>
                    <span>{fmt(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Balance Due at Completion</span>
                    <span>{fmt(balanceAmount)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Scope of Work */}
        {req.scopeOfWork && (
          <Card className="border-stone-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-canyon">Scope of Work</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-charcoal whitespace-pre-wrap font-sans leading-relaxed">{req.scopeOfWork}</pre>
            </CardContent>
          </Card>
        )}

        {/* Contract Text */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-canyon">Contract Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-charcoal leading-relaxed max-h-80 overflow-y-auto border border-stone-200 rounded p-4 bg-stone-50 whitespace-pre-wrap font-sans">
              {req.contractText}
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-canyon">
              <Camera className="h-4 w-4" /> Project Site Photos
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {photos.length}/{MAX_PHOTOS} uploaded
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please upload <strong>at least 1</strong> photo of your project site (up to {MAX_PHOTOS}). These help us prepare for your project and are saved to your file.
            </p>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100 group">
                    <img
                      src={photo.previewUrl}
                      alt={`Project photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-1.5 py-0.5 truncate">
                      {photo.name}
                    </div>
                  </div>
                ))}

                {/* Upload more slot */}
                {canAddMore && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-canyon hover:bg-amber-50/30 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-canyon"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">Add more</span>
                  </button>
                )}
              </div>
            )}

            {/* Empty state / primary upload button */}
            {photos.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full border-2 border-dashed border-stone-300 hover:border-canyon hover:bg-amber-50/30 transition-colors rounded-lg py-10 flex flex-col items-center gap-3 text-muted-foreground hover:text-canyon disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <ImageIcon className="h-8 w-8" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isUploading ? "Uploading…" : "Tap to upload photos"}
                  </p>
                  <p className="text-xs mt-0.5">JPEG, PNG, WEBP · Max 16 MB each</p>
                </div>
              </button>
            )}

            {/* Uploading indicator when adding more */}
            {isUploading && photos.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading {uploadingCount} photo{uploadingCount !== 1 ? "s" : ""}…</span>
              </div>
            )}

            {/* Requirement indicator */}
            {photos.length === 0 && !isUploading && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                At least 1 photo is required before you can sign.
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        {/* Signature */}
        <Card className="border-canyon/30 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-canyon">
              <PenLine className="h-4 w-4" /> Sign Here
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-charcoal mb-1 block">
                Type your full legal name to sign
              </label>
              <Input
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Your full name"
                className="font-serif text-lg"
                disabled={signMutation.isPending}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 accent-canyon"
                disabled={signMutation.isPending}
              />
              <span className="text-sm text-muted-foreground leading-snug">
                I have read and agree to the contract terms above. I understand that a 50% deposit is due today and the remaining balance is due upon project completion.
              </span>
            </label>

            {photos.length < MIN_PHOTOS && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Upload at least 1 project photo above before signing.
              </p>
            )}

            <Button
              onClick={handleSign}
              disabled={signMutation.isPending || !signedName.trim() || !agreed || photos.length < MIN_PHOTOS || isUploading}
              className="w-full bg-canyon hover:bg-canyon/90 text-white h-12 text-base gap-2"
            >
              {signMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing…</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Sign & Pay {fmt(depositAmount)} Deposit</>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Secure payment powered by Stripe. Your card details are never stored on our servers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
