import { Check} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { BannerCard, BannerCardHeader, BannerCardTitle, BannerCardContent } from "./ui/bannercard";
import ActionButton from "./ui/ActionButton";
import Link from "next/link";

export default function Pricing() {
  return (
    <section className="w-full py-12" id="pricing">
      <div style={{ padding: '100px' }} className="flex-column">
        <h2 className="font-bold text-center">
          Pricing
        </h2>
        <h1 className="text-[2.5rem] sm:text-[3rem] font-bold text-center">
          CHOOSE THE RIGHT PLAN FOR YOUR BUSINESS
        </h1>
        <h3 style={{ color: '#9da3ae' }} className="text-center">
          Try for free, only pay for usage
        </h3>
      </div>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 my-10">
          <Card className="w-full max-w-md">
            <CardHeader>
            </CardHeader>
            <CardTitle style = {{ padding: "20px"}} className="text-2xl text-white font-bold text-left">
                Starter
              </CardTitle>
            <CardContent>
              <ul style = {{ padding: "20px"}} className="space-y-4">
                <li className="flex items-center">
                  <span className="text-lg text-white font-bold">Whats included :</span>
                </li>
                <li className="flex items-center">
                  <Check style={{ color: '#D2B07E', padding: "2px" }}></Check>
                  <span style={{ color: "#9da3ae", fontSize: "16px"}} >1 calling hour free</span>
                </li>
                <li className="flex items-center">
                  <Check style={{ color: '#D2B07E', padding: "2px" }}></Check>
                  <span style={{ color: "#9da3ae", fontSize: "16px"}} >1 phone number free</span>
                </li>
              </ul>
              <div className="flex price" style={{ padding: "20px" }}>
                <h1 style={{ color: "#7D6E50" }} className="large-text">$99.00</h1> 
                <h2 className="text-white small-text"> / Month</h2>
              </div>
              <Link href="https://dashboard.syntag.ai/">
                <ActionButton className="w-full starter-get-started bg-black border border-2 border-[#7D6E50] text-center" name="Get Started" arrow={false} />
              </Link>
            </CardContent>
          </Card>
          <BannerCard style={{ backgroundImage: "/cardbackground.png" }} className="w-full max-w-md">
            <BannerCardHeader>
            </BannerCardHeader>
            <BannerCardTitle style = {{ padding: "20px"}} className="text-2xl text-white font-bold text-left">
                Business
            </BannerCardTitle>
            <BannerCardContent>
              <ul style = {{ padding: "20px"}} className="space-y-4">
                <li className="flex items-center">
                  <span className="text-lg text-white font-bold">Whats included :</span>
                </li>
                <li className="flex items-center">
                  <Check style={{ color: '#D2B07E', padding: "2px" }}></Check>
                  <span style={{ color: "#9da3ae", fontSize: "16px"}} >8$ per calling hour</span>
                </li>
                <li className="flex items-center">
                  <Check style={{ color: '#D2B07E', padding: "2px" }}></Check>
                  <span style={{ color: "#9da3ae", fontSize: "16px"}} >2$ monthly per phone number</span>
                </li>
              </ul>
              <div className="flex price" style={{ padding: "20px" }}>
                <h1 style={{ color: "#7D6E50" }} className="large-text">$99.00</h1> 
                <span className="text-white small-text"> / Month</span>
              </div>
              <Link href="https://dashboard.syntag.ai/">
                <ActionButton className="w-full start-now bg-gradient-to-r from-[#7D6E50] to-[#6C592E] text-black text-center" name="Get Started" arrow={false} />
              </Link>
            </BannerCardContent>
          </BannerCard>
        </div>
      </div>
    </section>
  );
}
