import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Users, Globe, Heart, Award } from "lucide-react";

const About = () => {
  const stats = [
    { value: "50K+", label: "Trips Planned" },
    { value: "120+", label: "Countries" },
    { value: "4.9", label: "User Rating" },
    { value: "24/7", label: "Support" },
  ];

  const values = [
    {
      icon: Globe,
      title: "Global Reach",
      description: "We've helped travelers explore destinations on every continent, from hidden gems to iconic landmarks.",
    },
    {
      icon: Heart,
      title: "Passion for Travel",
      description: "Our team consists of avid travelers who understand what makes a trip truly unforgettable.",
    },
    {
      icon: Users,
      title: "Community First",
      description: "We believe in the power of shared experiences and building connections through travel.",
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We're committed to providing the highest quality recommendations and service to every traveler.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                About <span className="text-gradient-primary">Wanderly</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We're on a mission to make travel planning effortless and exciting. Our AI-powered platform 
                combines technology with human expertise to create personalized journeys that exceed expectations.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                  <div className="text-primary-foreground/70 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Values
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                What drives us to create exceptional travel experiences
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {values.map((value) => (
                <div key={value.title} className="feature-card">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
