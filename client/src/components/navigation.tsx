import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

interface NavigationProps {
  isAuthenticated?: boolean;
  user?: any;
  onSignIn?: () => void;
  onGetStarted?: () => void;
  onLogout?: () => void;
}

export default function Navigation({ 
  isAuthenticated = false, 
  user, 
  onSignIn, 
  onGetStarted, 
  onLogout 
}: NavigationProps) {
  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      window.location.href = "/api/login";
    }
  };

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      window.location.href = "/api/login";
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = "/api/logout";
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Palette className="text-white w-4 h-4" />
            </div>
            <span className="text-xl font-bold text-gray-900">Brain Storm to ToDo List</span>
          </Link>

          {!isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center space-x-8">
                <a 
                  href="#features" 
                  className="text-muted-foreground hover:text-gray-900 transition-colors"
                  data-testid="link-features"
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  className="text-muted-foreground hover:text-gray-900 transition-colors"
                  data-testid="link-how-it-works"
                >
                  How it Works
                </a>
                <a 
                  href="#pricing" 
                  className="text-muted-foreground hover:text-gray-900 transition-colors"
                  data-testid="link-pricing"
                >
                  Pricing
                </a>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={handleSignIn}
                  data-testid="button-sign-in"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={handleGetStarted}
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="User avatar" 
                    className="w-8 h-8 rounded-full object-cover"
                    data-testid="img-user-avatar"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {user?.firstName?.[0] || user?.email?.[0] || '?'}
                    </span>
                  </div>
                )}
                <span data-testid="text-user-name">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User'}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
