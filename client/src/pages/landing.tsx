import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Wand2, Users, ArrowRight, Play } from "lucide-react";

export default function Landing() {
  const handleGetStarted = () => {
    window.location.href = "/api/login";
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Palette className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-gray-900">Canvas Ideas</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-gray-900 transition-colors">How it Works</a>
              <a href="#pricing" className="text-muted-foreground hover:text-gray-900 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleSignIn} data-testid="button-sign-in">
                Sign In
              </Button>
              <Button onClick={handleGetStarted} data-testid="button-get-started">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="lg:col-span-6">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                Canvas Ideas
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mt-4 mb-8">
                Transform brainstorming into actionable tasks
              </p>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Turn your visual brainstorming sessions into organized, actionable task lists. 
                Perfect for creative individuals and small teams who think visually but need structured execution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-primary text-white px-8 py-4 text-lg font-medium hover:bg-primary/90 shadow-lg hover:shadow-xl"
                  data-testid="button-start-brainstorming"
                >
                  Start Brainstorming
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 px-8 py-4 text-lg font-medium"
                  data-testid="button-watch-demo"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="lg:col-span-6 mt-12 lg:mt-0">
              <img 
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Creative brainstorming session" 
                className="rounded-2xl shadow-2xl w-full h-auto" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              From Ideas to Action
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Bridge the gap between creative thinking and productive execution with our intuitive canvas-to-task workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 bg-gray-50 hover:bg-gray-100 transition-colors border-0">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Palette className="text-white w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Visual Brainstorming</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sketch, draw, and organize your ideas on an infinite canvas with intuitive tools designed for creative thinking.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 bg-gray-50 hover:bg-gray-100 transition-colors border-0">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Wand2 className="text-white w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Conversion</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Automatically convert your visual concepts into structured, actionable task lists with smart categorization.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 bg-gray-50 hover:bg-gray-100 transition-colors border-0">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="text-white w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Team Collaboration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Share your canvas with team members and collaborate in real-time on both brainstorming and task execution.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
