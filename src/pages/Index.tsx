import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RoleCard } from "@/components/RoleCard";
import { Button } from "@/components/ui/button";
import { GraduationCap, HeartHandshake, Globe, Shield, TrendingUp, Users } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Empowering Education Through
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Dignity & Hope</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                PadForward connects higher education institutions with compassionate investors to provide 
                sanitary pads to underprivileged female students, ensuring they never miss class due to period poverty.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#get-started">
                  <Button variant="hero" size="xl">
                    Join the Movement
                  </Button>
                </a>
                <a href="#impact">
                  <Button variant="outline" size="xl">
                    See Our Impact
                  </Button>
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl"></div>
              <img 
                src={heroImage} 
                alt="Diverse female students in university setting" 
                className="relative rounded-2xl shadow-large w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section id="impact" className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Users, value: "50,000+", label: "Students Helped" },
              { icon: GraduationCap, value: "200+", label: "Institutions" },
              { icon: HeartHandshake, value: "500+", label: "Investors" },
              { icon: Globe, value: "15", label: "Countries" },
            ].map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-hero items-center justify-center shadow-soft mb-4">
                  <stat.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-4xl font-bold text-primary">{stat.value}</h3>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Choose Your Path to
              <span className="bg-gradient-hero bg-clip-text text-transparent"> Make Impact</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you represent an institution in need or an investor ready to give, 
              we make it simple to connect and create meaningful change.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <RoleCard
              title="I am an Institution"
              description="Connect with investors to request sanitary pads for your students. Track donations, manage distributions, and report impact."
              icon={GraduationCap}
              link="/register/institution"
              gradient="teal"
            />
            <RoleCard
              title="I am an Investor"
              description="Browse verified institutions, donate pads or funds, and see the real-world impact of your generosity on students' lives."
              icon={HeartHandshake}
              link="/register/investor"
              gradient="coral"
            />
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-hero items-center justify-center shadow-medium">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-4xl font-bold">Trusted & Transparent</h2>
            <p className="text-lg text-muted-foreground">
              Every institution and investor is verified by our admin team before gaining full access. 
              We ensure transparency through documentation requirements and impact reporting, 
              building trust between donors and recipients.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              {[
                { title: "Admin Verification", desc: "All users verified before activation" },
                { title: "Secure Platform", desc: "Bank-grade security & data protection" },
                { title: "Impact Tracking", desc: "Real-time donation & distribution tracking" },
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
