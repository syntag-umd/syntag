import Image from "next/image";
import Link from "next/link";
import ActionButton from "./ui/ActionButton";

export default function Navbar() {
  return (
    <div className="flex flex-row gap-5 items-center justify-between w-full py-4 text-[color:var(--primary)] text-nowrap text-lg">
      <Image src={`/logo.png`} alt={"SynTag logo"} width="100" height="60" />
      <div style={{ width: '30%' }} className="hidden sm:flex flex-row justify-start items-center gap-5 w-full">
        <a href={"#setup"}>
          <div>Set Up</div>
        </a>
        <a style={{ color: '#D2B07E' }}>
        ·
        </a>
        <a href={"#pricing"}>
          <div>Pricing</div>
        </a>
        <a style={{ color: '#D2B07E' }}>
        ·
        </a>
        <a href={"#navbar"}>
          <div>About</div>
        </a>
      </div>
      <nav style={{ width: "30%" }} className="flex flex-row mt-4 gap-4 justify-center lg:justify-start">
        <Link className="contact-sales-nav rounded-lg bg-black border border-2 border-[#7D6E50] text-[#7D6E50] w-full h-full" href="https://calendly.com/vikram-from-syntag/30min">
        <ActionButton name="Contact Sales" arrow={false} />
        </Link>
        <Link className="dashboard-nav rounded-lg bg-gradient-to-r from-[#7D6E50] to-[#6C592E] border border-2 border-black w-full h-full" href="https://dashboard.syntag.ai/">
          <ActionButton name="Dashboard" arrow={false} />
        </Link>
      </nav>
    </div>
  );
}
