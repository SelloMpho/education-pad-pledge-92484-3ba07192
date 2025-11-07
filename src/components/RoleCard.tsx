import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  link: string;
  gradient?: "teal" | "coral";
}

export const RoleCard = ({ title, description, icon: Icon, link, gradient = "teal" }: RoleCardProps) => {
  return (
    <Link to={link} className="block group">
      <Card className={`h-full transition-all duration-500 hover:shadow-large hover:-translate-y-2 border-2 ${
        gradient === "teal" ? "hover:border-primary" : "hover:border-secondary"
      }`}>
        <CardHeader className="space-y-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            gradient === "teal" ? "bg-gradient-hero" : "bg-gradient-coral"
          } shadow-soft group-hover:shadow-medium transition-all duration-500 group-hover:scale-110`}>
            <Icon className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant={gradient === "teal" ? "hero" : "coral"} 
            size="lg" 
            className="w-full group-hover:gap-4"
          >
            Get Started
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};
