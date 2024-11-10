import Link from "next/link";
import ActionButton from "../ui/ActionButton";
import ModifiedActionButton from "../ui/ModiifedActionButton";
import Demo from "./Demo";
import { Radius } from "lucide-react";

export default function Hero() {
  return (
    <div className="flex md:flex-row flex-wrap w-full mt-10 mb-4">
      <div className="flex md:flex-row" >
        <div className="w-full lg:w-1/2 p-3 text-center lg:text-left">
          <div style={{ padding: "20px" }} className="flex flex-row">
            <div className="gold" style={{ borderRadius: "27px", backgroundColor: "white", color: "black"}} >
              <ModifiedActionButton name = "New" arrow={false}/>
            </div>
            <div style={{ borderRadius: "27px", backgroundColor: "black", color: "white"}} >
              <ModifiedActionButton name = "Introducing AI Editor" arrow={true}/> 
            </div>
          </div>
          <h1 style = {{ fontSize: "57px" }}className="font-extrabold text-[3rem] sm:text-[4rem] md:text-[5.5rem] text-wrap leading-none">
            AI Receptionists made{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7D6E50] to-[#6C592E]">
              easy
            </span>
          </h1>
          <div className="my-10">
            <h2 className="font-medium text-[1.25rem] mb-5 text-transparent bg-clip-text bg-gradient-to-r from-[#87878C] to-[#87878C]">
              Enjoy a quieter phone and let SynTag handle all your customer calls
              instantly. Grow revenue and save time, so you can work on what
              matters most.
            </h2>
          </div>
          <div className="flex flex-row mt-4 gap-4 justify-center lg:justify-start">
            <div>
            <Link href="https://dashboard.syntag.ai/">
              <ActionButton className="start-now bg-gradient-to-r from-[#7D6E50] to-[#6C592E] text-black" name="Start Now" arrow={true} />
            </Link>
            </div>
            <div>
            <Link href="https://calendly.com/vikram-from-syntag/30min">
              <ActionButton
                className="my-next-button bg-black border border-2 border-[#7D6E50] text-white"
                name="Contact Sales"
                arrow={true}
              />
            </Link>
            </div>
          </div>
        </div>
        <div className="flex-grow">
          <Demo className="w-full H-full"/>
        </div>
      </div>
      {/* left circle */}
      <div className="hidden sm:block absolute -top-1 -left-1/4 transform -translate-x-1/2 md:ml-[400px] -z-10">
        <div className="h-64 w-64 md:h-80 md:w-80 rounded-full bg-gradient-to-tr from-[color:var(--primary)] opacity-50 blur-[80px]"></div>
      </div>
      {/* right circle*/}
      <div className="absolute -top-[1rem] -right-1 md:-top-20 md:right-0 md:left-1/2 transform -translate-x-1/2 md:ml-[400px] -z-10">
        <div className="h-64 w-64 md:h-80 md:w-80 rounded-full bg-gradient-to-tr from-[color:var(--primary)] opacity-50 blur-[80px]"></div>
      </div>
      {/* bottom circle */}
      <div className="absolute top-[40rem] left-1/4 md:top-[28rem] md:right-80 transform -translate-x-1/2 md:ml-[400px] -z-10">
        <div className="h-64 w-64 md:h-80 md:w-80 rounded-full bg-gradient-to-tr from-[color:var(--primary)] opacity-50 blur-[80px]"></div>
      </div>
    </div>
  );
}
