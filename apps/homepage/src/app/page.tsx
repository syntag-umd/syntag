import Footer from "./_components/Footer";
import Navbar from "./_components/Navbar";
import Pricing from "./_components/Pricing";
import Setup from "./_components/Setup";
import Hero from "./_components/header/Hero";

export default function Home() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)] m-auto px-0 md:px-10 max-w-[1500px]">
      <main className="mx-5 sm:mx-10">
        <Navbar/>
        <Hero/>
        <Setup/>
        <Pricing/>
      </main>
      <Footer/>
    </div>
  );
}
