
export default function FilePreview({ url }: { url: string }) {

    return (
        <div className="flex flex-row my-auto">
            {/* <div className="m-4 whitespace-nowrap">
                <p className="text-sm font-semibold">File Options</p>
                <p className="text-xs">Coming Soon...</p>
            </div> */}
            <iframe 
                className="w-full aspect-[4/3]" 
                src={url} 
                width="800" 
                height="700"
            />        
        </div>
    );
}
