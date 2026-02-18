import { Wallet, Route, CalendarCheck, LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: string;
}

const FeatureCard = ({ icon: Icon, title, description, delay = "0s" }: FeatureCardProps) => (
  <div 
    className="feature-card group animate-fade-in"
    style={{ animationDelay: delay }}
  >
    <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4 group-hover:bg-primary transition-colors duration-300">
      <Icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const FeaturesSection = () => {
  const features = [
    {
      icon: Wallet,
      title: "Smart Budget Matching",
      description: "Tell us your budget and we'll find the perfect accommodations, activities, and dining options that maximize your experience.",
    },
    {
      icon: Route,
      title: "Personalized Itineraries",
      description: "Get custom day-by-day plans tailored to your interests, travel style, and pace — whether you're an adventurer or a relaxer.",
    },
    {
      icon: CalendarCheck,
      title: "Seamless Booking",
      description: "Book flights, hotels, and experiences directly through our platform with exclusive deals and instant confirmations.",
    },
  ];

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose <span className="text-gradient-primary">DiaryTrips</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your personal travel companion for creating unforgettable journeys
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={`${0.2 + index * 0.15}s`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
