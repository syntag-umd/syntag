import Link from "next/link";
import ActionButton from "../ui/ActionButton";
import Demo from "./Demo";

export default function Hero() {
  return (
    <div className="flex md:flex-row flex-wrap w-full mt-10 mb-4">
      <div className="w-full lg:w-1/2 p-3 text-center lg:text-left">
        <h1 className="font-extrabold text-[3rem] sm:text-[4rem] md:text-[5.5rem] text-wrap leading-none">
          AI Receptionists made{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F84F4F] to-[#FF8C8C]">
            easy
          </span>
        </h1>
        <div className="my-10">
          <h2 className="font-medium text-[1.25rem] mb-5">
            Enjoy a quieter phone and let SynTag handle all your customer calls
            instantly. Grow revenue and save time, so you can work on what
            matters most.
          </h2>
          <div className="bg-black text-white p-1 px-2 m-auto lg:m-0 w-fit text-nowrap rounded-full">
            <span className="hidden sm:inline-block">
              {" "}
              Schedule a call with us and get{" "}
            </span>{" "}
            300 minutes of calling for free
          </div>
        </div>
        <div className="flex flex-row mt-4 gap-4 justify-center lg:justify-start">
          <Link href="https://dashboard.syntag.ai/">
            <ActionButton name="Start Now" arrow={true} />
          </Link>
          <Link href="https://calendly.com/vikram-from-syntag/30min">
            <ActionButton
              className="bg-black"
              name="Contact Sales"
              arrow={false}
            />
          </Link>
        </div>
      </div>
      <div className="w-full lg:w-1/2 relative">
        <img
          className="hidden lg:block rounded-lg absolute top-0 left-52 min-w-[900px] min-h-[500px] overflow-visible"
          src="/dashboard.png"
          alt="SynTag dashboard analytics"
        />
        <Demo className="relative lg:left-32 mx-auto mt-12 lg:mx-0 lg:mt-[16rem]" />
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
