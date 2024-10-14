export default function FilePreview({ url }: { url: string }) {
  return (
    <div className="my-auto flex flex-row">
      {/* <div className="m-4 whitespace-nowrap">
                <p className="text-sm font-semibold">File Options</p>
                <p className="text-xs">Coming Soon...</p>
            </div> */}
      <iframe
        className="aspect-[4/3] w-full"
        src={url}
        width="800"
        height="700"
      />
    </div>
  );
}
