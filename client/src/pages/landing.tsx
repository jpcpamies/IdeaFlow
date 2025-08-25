import { Button } from "@/components/ui/button";
import { 
  Palette, 
  CheckSquare, 
  Target, 
  ArrowRight, 
  Play, 
  Lightbulb, 
  List, 
  BarChart3,
  Users2,
  Download,
  MousePointer2
} from "lucide-react";

export default function Landing() {
  const handleGetStarted = () => {
    window.location.href = "/auth";
  };

  const handleSignIn = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Lightbulb className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-gray-900">Clear Mind</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#benefits" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Benefits</a>
              <a href="#cta" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Get Started</a>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleSignIn} data-testid="button-sign-in" className="text-gray-600">
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted} 
                data-testid="button-get-started"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Open Canvas
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-6">
              <Target className="w-4 h-4 mr-2" />
              Transform your ideas into reality
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
            Your Ideas,{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Beautifully Organized
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
            Create, organize, and visualize your ideas on an infinite canvas. Turn scattered thoughts 
            into structured plans with our intuitive idea management platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl"
              data-testid="button-start-creating"
            >
              Start Creating
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
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to organize ideas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to help you capture, organize, and develop your ideas efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Palette className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Infinite Canvas</h3>
              <p className="text-gray-600 leading-relaxed">
                Never run out of space. Create and organize ideas on an unlimited canvas that scales with your creativity.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <List className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Categories</h3>
              <p className="text-gray-600 leading-relaxed">
                Organize ideas with color-coded categories and tags. Find what you need instantly with intelligent filtering.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckSquare className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Quick Capture</h3>
              <p className="text-gray-600 leading-relaxed">
                Capture ideas instantly with our streamlined interface. Add details, colors, and categories in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section id="benefits" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-orange-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Tracking</h3>
                <p className="text-gray-600">Monitor project progress with visual indicators and completion percentages.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MousePointer2 className="text-pink-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Drag & Drop</h3>
                <p className="text-gray-600">Intuitively reorganize ideas and tasks with smooth drag-and-drop interactions.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Priority System</h3>
                <p className="text-gray-600">Set priorities and organize tasks by importance to focus on what matters most.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users2 className="text-purple-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Collaboration</h3>
                <p className="text-gray-600">Share projects and collaborate with team members in real-time.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="text-green-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Export & Share</h3>
                <p className="text-gray-600">Export your organized ideas and task lists in multiple formats.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckSquare className="text-indigo-600 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Management</h3>
                <p className="text-gray-600">Convert ideas into actionable tasks with completion tracking and deadlines.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Trusted by creative minds everywhere</h2>
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500">
            <div className="px-4 py-2 bg-gray-100 rounded-lg font-medium">Creative Co.</div>
            <div className="px-4 py-2 bg-gray-100 rounded-lg font-medium">Design Studio</div>
            <div className="px-4 py-2 bg-gray-100 rounded-lg font-medium">Tech Startup</div>
          </div>
          <div className="mt-8 flex justify-center items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-yellow-400 text-xl">★</span>
            ))}
            <span className="ml-2 text-gray-600">4.9 out of 5 stars</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to organize your ideas?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who use Clear Mind to turn their thoughts into actionable plans.
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl"
            data-testid="button-get-started-free"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-blue-100">
            <div className="flex items-center">
              <CheckSquare className="w-4 h-4 mr-2" />
              Free forever plan
            </div>
            <div className="flex items-center">
              <CheckSquare className="w-4 h-4 mr-2" />
              No credit card required
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
