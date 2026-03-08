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
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {subtitle ? <p className="mb-2 text-xs text-slate-500">{subtitle}</p> : null}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {src ? (
          <img src={src} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-slate-500">No image</div>
        )}
        {loading ? (
          <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[1px]">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
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
