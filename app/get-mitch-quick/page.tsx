import type { Metadata } from "next";
import DemoNav from "@/components/DemoNav";
import GetMitchQuick from "@/components/getmitchquick/GetMitchQuick";

export const metadata: Metadata = {
  title: "Get Mitch Quick — Adam Klockars",
  description:
    "A parody remake of the old DOS text trader Drug Lord / Drug Wars — buy low, sell high on absurd black-market goods, dodge escalating busts, pay off the loan shark, and get Mitch quick in 30 days.",
};

export default function GetMitchQuickPage() {
  return (
    <>
      <DemoNav />
      <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-8 sm:px-6 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Play
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Get Mitch Quick
        </h1>
        <p className="mt-3 hidden max-w-md text-center text-muted sm:block">
          A parody of the old DOS text trader I wasted study hall on. Buy low,
          sell high on absurd contraband, pay off the loan shark, and survive 30
          days of increasingly violent mall cops.
        </p>

        <div className="mt-6 w-full sm:mt-12">
          <GetMitchQuick />
        </div>
      </main>
    </>
  );
}
