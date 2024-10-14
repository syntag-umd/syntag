import Image from 'next/image'
import Link from 'next/link'
import ActionButton from './ui/ActionButton'

export default function Navbar() {
  return (
    <div className="flex flex-row gap-5 items-center justify-between w-full py-4 text-[color:var(--primary)] text-nowrap text-lg">
      <Image src={`/logo.png`} alt={"SynTag logo"} width="100" height="60" />
      <div className ="hidden sm:flex flex-row justify-start items-center gap-5 w-full">
        <a href={'#setup'}>
          <div>Set Up</div>
        </a>
        <a href={'#pricing'}>
          <div>Pricing</div>
        </a>
      </div>
      <nav className="flex flex-row items-center">
          <Link href='https://calendly.com/vikram-from-syntag/30min'> 
            Contact Sales
          </Link>
          <Link href='https://dashboard.syntag.ai/'> 
            <ActionButton className="m-4" name="Dashboard" arrow={true}/> 
          </Link>
      </nav>
    </div>
  )
}
