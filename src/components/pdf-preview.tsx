"use client";

interface Props {
  blobUrl: string | null;
}

export function PdfPreview({ blobUrl }: Props) {
  if (!blobUrl) {
    return (
      <div className="glass-card border-white/10 rounded-lg h-[600px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Edit the narrative, then click Build PDF to preview
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      className="w-full h-[600px] rounded-lg border border-white/10"
      title="Report PDF Preview"
    />
  );
}
