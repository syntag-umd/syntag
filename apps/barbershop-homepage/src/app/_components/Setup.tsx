import Image from "next/image";
import ActionButton from "./ui/ActionButton";
import Link from "next/link";
import { Circle } from "lucide-react";


export default function Setup() {
  return (
    <section className="mt-20" id="setup">
      <div style={{ padding: '100px' }} className="flex-column">
        <h2 className="font-bold text-center">
          Customizable
        </h2>
        <h1 className="text-[2.5rem] sm:text-[3rem] font-bold text-center">
          SETUP
        </h1>
        <h3 style={{ color: '#9da3ae' }} className="text-center">
          It is long established fact that a reader will be destracted by the readable content of a page when looking at its layout
        </h3>
      </div>
      <div style={{ padding: '20px' }} className="flex flex-row">
        <div style={{ width: '50%', padding: '20px' }} className="flex-col">
          <Link style={{ width: "15%" }} className="setup-action-button rounded-lg border border-2 border-black w-full h-full" href="https://dashboard.syntag.ai/">
            <ActionButton name="TUNED" arrow={false} />
          </Link>
          <h1 style={{ padding: '20px' , fontSize: '46px' }} className="text-[2.5rem] sm:text-[3rem] font-bold mb-4">
            Track your income and expenses painlessly
          </h1>
          <div className="flex flex-row">
            <div style={{ position: 'relative', top: '5px' }}>
              <Circle style = {{ padding: '2px' }} size={25} color="#a6a68c" strokeWidth={5} />
            </div>
            <div style = {{ padding: '2px' }} className="text-gray-400 text-lg">
              Create a custom receptionist for your business in just a few steps.
              Start by giving your receptionist a name, then choose the specific
              business where they will operate. Tailor the receptionist's
              personality by selecting the emotions they can display, ensuring
              they match your brand’s tone and customer experience.
            </div>
          </div>
        </div>
        <div style={{ width: '50%', padding: '20px' }}>
          <Image
            src="/setupfirst.png"
            alt={"First setup picutre"}
            width={600}
            height={300}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      </div>
      <div style={{ padding: '20px' }} className="flex flex-row">
        <div style={{ width: '50%', padding: '20px' }}>
          <Image
            src="/setupsecond.png"
            alt={"Second setup picutre"}
            width={600}
            height={300}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
        <div style={{ width: '50%', padding: '20px' }} className="flex-col">
        <Link style={{ width: "27%" }} className="setup-action-button rounded-lg border border-2 border-black w-full h-full" href="https://dashboard.syntag.ai/">
            <ActionButton name="RECEPTIONIST" arrow={false} />
          </Link>
          <h1 style={{ padding: '20px' , fontSize: '46px' }} className="text-[2.5rem] sm:text-[3rem] font-bold mb-4">
            Website to receptionist in seconds
          </h1>
          <div className="flex flex-row">
            <div style={{ position: 'relative', top: '5px' }}>
              <Circle style = {{ padding: '2px' }} size={25} color="#a6a68c" strokeWidth={5} />
            </div>
            <div style = {{ padding: '5px' }} className="text-gray-400 text-lg">
              Easily enhance your receptionist's knowledge by adding websites and
              files for context. With recursive scraping, quickly upload website
              information, making setup seamless. Instantly provide the key
              details your receptionist needs by adding various file types,
              ensuring it has all the necessary information to assist your
              business.
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '20px' }} className="flex flex-row">
        <div style={{ width: '50%', padding: '20px' }} className="flex-col">
          <Link style={{ width: "38%" }} className="setup-action-button rounded-lg border border-2 border-black w-full h-full" href="https://dashboard.syntag.ai/">
            <ActionButton name="INCOME AND EXPENSES" arrow={false} />
          </Link>
          <h1 style={{ padding: '20px' , fontSize: '46px' }} className="text-[2.5rem] sm:text-[3rem] font-bold mb-4">
            Track your income and expenses painlessly
          </h1>
          <div className="flex flex-row">
            <div style={{ position: 'relative', top: '5px' }}>
              <Circle style = {{ padding: '2px' }} size={25} color="#a6a68c" strokeWidth={5} />
            </div>
            <div style = {{ padding: '2px' }} className="text-gray-400 text-lg">
              Track and analyze your receptionist's performance with detailed
              analytics and transcripts. Access insights on both sub-agent and
              home page interactions to better understand your callers. Use this
              data to gain deeper insights into your customers' needs and improve
              overall service.
            </div>
          </div>
        </div>
        <div style={{ width: '50%', padding: '20px' }}>
          <Image
            src="/setupthird.png"
            alt={"Third setup picutre"}
            width={600}
            height={300}
            style={{
              width: '100%',
              height: '100%',
            }}
            />
          </div>
      </div>
    </section>
  );
}
