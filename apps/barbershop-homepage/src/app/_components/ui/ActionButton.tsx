import { ArrowRight } from "lucide-react";

interface ActionButton {
  name: string;
  arrow: boolean;
  className?: string;
}

export default function ActionButton({ name, arrow, className }: ActionButton) {
  return (
    <button
      className={`flex flex-row gap-1 font-medium items-center text-white bg-[color:var(--primary)] text-nowrap rounded-full py-2 px-3
                    transition shadow-sm hover:scale-110 ease-out duration-500 ${className}`}
    >
      <div>{name}</div>
      {arrow && <ArrowRight size={20} style={{ transform: 'rotate(315deg)' }} />}
    </button>
  );
}
