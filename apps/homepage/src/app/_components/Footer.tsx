import { Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="flex flex-row justify-between text-[color:var(--primary)] text-base sm:text-lg text-nowrap p-3 px-5">
        <div className="flex flex-row items-center gap-2 sm:gap-5">
            <small>Copyright</small>
            <a target="_blank" href={"/terms-of-service"} rel="noopener noreferrer">
                <small>Terms of Service</small>
            </a>
            <a target="_blank" href={"/privacy-policy"} rel="noopener noreferrer">
                <small>Privacy Policy</small>
            </a> 
        </div>
        <div className="flex flex-row items-center ml-3 gap-5">
            {/* Add Linkedin Logo */}
            <a target="_blank" href="https://www.linkedin.com/company/syntag-inc/" rel="noopener noreferrer">
                <small>LinkedIn</small>
            </a>
            <a target="_blank" href="mailto:admin@syntag.ai" rel="noopener noreferrer">
                <Mail/>
            </a>
        </div>
    </footer>
  );
}