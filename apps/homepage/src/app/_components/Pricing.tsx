
import { Check, Phone, Clock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import ActionButton from "./ui/ActionButton"
import Link from "next/link"

export default function Pricing() {
  return (
    <section className="w-full py-12" id="pricing">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
        <h1 className="text-[2.5rem] sm:text-[3rem] font-bold text-center">Pricing</h1>
        <p className="text-xl text-muted-foreground">Try for free, only pay for usage</p>
        </div>
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 my-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">New User</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-lg">1 calling hour free</span>
                </li>
                <li className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-lg">1 phone number free</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Monthly</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Phone className="mr-2 h-5 w-5 text-primary" />
                  <span className="text-lg"><span className="font-semibold">$8</span> per calling hour</span>
                </li>
                <li className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  <span className="text-lg"><span className="font-semibold">$2</span> monthly per phone number</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
        <Link href='https://dashboard.syntag.ai/'> 
          <ActionButton className="m-auto" name="Start Now" arrow={true}/>
        </Link>
      </div>
    </section>
  )
}