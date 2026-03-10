type Props = {
  title: string;
  src?: string;
  subtitle?: string;
  loading?: boolean;
  loadingText?: string;
};

export default function ImageCard({
  title,
  src,
  subtitle,
  loading = false,
  loadingText = "Generating image...",
}: Props) {
  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      {subtitle ? <p className="mb-2 text-xs text-slate-400">{subtitle}</p> : null}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80">
        {src ? (
          <img src={src} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-slate-500">No image</div>
        )}
        {loading ? (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/65 backdrop-blur-[1px]">
            <div className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="spinner" />
                <span>{loadingText}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
