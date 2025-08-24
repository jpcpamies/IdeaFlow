# Brain Storm to ToDo List

## Overview

Brain Storm to ToDo List is a collaborative visual project management application that combines an interactive canvas interface with task management capabilities. The system allows users to create projects, visualize their ideas on a digital canvas using various drawing tools, and manage associated tasks. The application features a React frontend with Express backend, using PostgreSQL for data persistence and Replit's authentication system for user management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Main UI framework using functional components and hooks
- **Wouter**: Lightweight client-side routing for navigation between landing, dashboard, and canvas pages
- **TanStack Query**: Data fetching and caching layer for API communication
- **Shadcn/ui + Radix UI**: Component library providing accessible UI primitives
- **Tailwind CSS**: Utility-first styling with custom design system variables
- **Vite**: Build tool and development server with hot module replacement

### Backend Architecture  
- **Express.js**: RESTful API server handling authentication, projects, and tasks
- **Node.js with ES modules**: Runtime environment using modern JavaScript features
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Session-based authentication**: Using express-session with PostgreSQL session store
- **Passport.js with OpenID Connect**: Integration with Replit's authentication system

### Data Storage
- **PostgreSQL**: Primary database using Neon serverless driver
- **Database Schema**:
  - `users`: User profiles and authentication data (required for Replit Auth)
  - `sessions`: Session storage table (required for Replit Auth)
  - `projects`: Project metadata, canvas data (JSON), status, and progress tracking
  - `tasks`: Task management with completion status, priority, and project association
- **Drizzle migrations**: Schema versioning in the migrations directory

### Authentication and Authorization
- **Replit Authentication**: OAuth2/OpenID Connect integration for seamless Replit user experience
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session persistence
- **Route Protection**: Middleware-based authentication checks on all API endpoints
- **User Context**: Automatic user session management with proper cleanup

### Canvas System
- **Interactive Drawing Tools**: Select, pen, shapes, text, sticky notes, eraser, and move tools
- **Canvas State Management**: Real-time tool selection and canvas interaction handling
- **Task Integration**: Side panel for viewing and managing project-related tasks
- **Responsive Design**: Mobile-friendly canvas interface with collapsible panels

### Project Management
- **CRUD Operations**: Full project lifecycle management with status tracking
- **Progress Monitoring**: Numerical progress indicators and status management
- **Canvas Data Persistence**: JSON storage of canvas elements and user interactions
- **User-scoped Data**: All projects and tasks are isolated per authenticated user

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **express**: Web application framework for API routing
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router

### Authentication Services
- **Replit OIDC**: Primary authentication provider using OpenID Connect
- **openid-client**: OAuth2/OpenID Connect client implementation
- **passport**: Authentication middleware framework
- **express-session**: Session management middleware
- **connect-pg-simple**: PostgreSQL session store adapter

### UI and Styling
- **@radix-ui/***: Accessible React component primitives (20+ components)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library for consistent iconography

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and enhanced developer experience
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling

### Data Validation
- **zod**: Schema validation for API inputs and database operations
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation
- **@hookform/resolvers**: Form validation resolver for React Hook Form