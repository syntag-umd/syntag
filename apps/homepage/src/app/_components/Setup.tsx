import Image from "next/image";
import ActionButton from "./ui/ActionButton";
import Link from "next/link";

export default function Setup() {
  return (
    <section className="mt-20" id="setup">
      <h1 className="text-[2.5rem] sm:text-[3rem] font-bold text-center">
        Setup
      </h1>
      <div className="flex flex-row flex-wrap justify-around my-10">
        <Image
          className="flex-col p-3 drop-shadow-lg rounded-[20px]"
          src="/create.png"
          alt="creating an AI receptionist"
          width={600}
          height={300}
        />
        <div className="flex-col order-first xl:order-last w-full min-w-0 md:min-w-[600px] md:w-1/2 p-3 pl-6">
          <h2 className="text-3xl font-semibold mb-4">
            1. Tuned for your business
          </h2>
          <div className="text-gray-400 text-lg">
            Create a custom receptionist for your business in just a few steps.
            Start by giving your receptionist a name, then choose the specific
            business where they will operate. Tailor the receptionist's
            personality by selecting the emotions they can display, ensuring
            they match your brand’s tone and customer experience.
          </div>
        </div>
      </div>
      <div className="flex flex-row flex-wrap justify-around my-10">
        <Image
          className="flex-col p-3 drop-shadow-lg rounded-[20px]"
          src="/knowledge.png"
          alt="knowledge base to contextualize receptionists"
          width={600}
          height={300}
        />
        <div className="flex-col order-first xl:order-last w-full min-w-0 md:min-w-[600px] md:w-1/2 p-3 pl-6">
          <h2 className="text-3xl font-semibold mb-4">
            2. Website to receptionist in seconds
          </h2>
          <div className="text-gray-400 text-lg">
            Easily enhance your receptionist's knowledge by adding websites and
            files for context. With recursive scraping, quickly upload website
            information, making setup seamless. Instantly provide the key
            details your receptionist needs by adding various file types,
            ensuring it has all the necessary information to assist your
            business.
          </div>
        </div>
      </div>
      <div className="flex flex-row flex-wrap justify-around my-10">
        <Image
          className="flex-col p-3 drop-shadow-lg rounded-[20px]"
          src="/analytics.png"
          alt="dashboard analytics"
          width={600}
          height={300}
        />
        <div className="flex-col order-first xl:order-last w-full min-w-0 md:min-w-[600px] md:w-1/2 p-3 pl-6">
          <h2 className="text-3xl font-semibold mb-4">
            3. Analytics to monitor and understand your callers.
          </h2>
          <div className="text-gray-400 text-lg">
            Track and analyze your receptionist's performance with detailed
            analytics and transcripts. Access insights on both sub-agent and
            home page interactions to better understand your callers. Use this
            data to gain deeper insights into your customers' needs and improve
            overall service.
          </div>
          {/* <Link href="https://dashboard.syntag.ai/">
            <ActionButton
              className="mt-10 mx-0 hidden xl:flex "
              name="Create Your Own Now"
              arrow={true}
            />
          </Link> */}
          <Link href="">
            <ActionButton
              className="mt-10 mx-0 hidden xl:flex "
              name="Create Your Own Now"
              arrow={true}
            />
          </Link>
        </div>
        <div className="flex-col order-last w-full flex xl:hidden">
          {/* <Link href="https://dashboard.syntag.ai/">
            <ActionButton
              className="mt-10 mx-auto"
              name="Create Your Own Now"
              arrow={true}
            />
          </Link> */}
          <Link href="">
            <ActionButton
              className="mt-10 mx-auto"
              name="Create Your Own Now"
              arrow={true}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
