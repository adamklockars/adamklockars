import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import ProjectSection from "@/components/landing/ProjectSection";
import PlaySection from "@/components/landing/PlaySection";
import Experience from "@/components/landing/Experience";
import About from "@/components/landing/About";
import Footer from "@/components/landing/Footer";
import ScrollChrome from "@/components/landing/ScrollChrome";
import { projects } from "@/content/projects";

export default function Home() {
  return (
    <>
      <Header />
      <ScrollChrome />
      <main>
        <Hero />
        {projects.map((project, index) => (
          <ProjectSection key={project.id} project={project} index={index} />
        ))}
        <PlaySection />
        <Experience />
        <About />
      </main>
      <Footer />
    </>
  );
}
