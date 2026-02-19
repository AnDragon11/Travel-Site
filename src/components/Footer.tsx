import { Link } from "react-router-dom";
import { Compass, Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold">DiaryTrips</span>
          </Link>

          {/* Quick Links */}
          <div className="flex gap-6 text-sm text-background/70">
            <Link to="/" className="hover:text-background transition-colors">Plan a Trip</Link>
            <Link to="/explore" className="hover:text-background transition-colors">Explore</Link>
            <Link to="/profile" className="hover:text-background transition-colors">Profile</Link>
          </div>

          {/* Contact */}
          <a
            href="mailto:hello@diarytrips.com"
            className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors"
          >
            <Mail className="w-4 h-4" />
            hello@diarytrips.com
          </a>
        </div>

        <div className="border-t border-background/10 mt-5 pt-4 text-center text-background/40 text-xs">
          © {currentYear} DiaryTrips. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
