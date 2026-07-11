import React from 'react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, SearchX, ServerCrash } from 'lucide-react';
import { motion } from 'framer-motion';

export function ErrorPage({ code, title, description, icon: Icon }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex max-w-md flex-col items-center justify-center space-y-6"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary/50">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">{code}</h1>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Button onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function Error401() {
  return <ErrorPage code="401" title="Unauthorized" description="You must be logged in to view this page." icon={ShieldAlert} />;
}

export function Error403() {
  return <ErrorPage code="403" title="Forbidden" description="You do not have permission to access this resource." icon={AlertTriangle} />;
}

export function Error404() {
  return <ErrorPage code="404" title="Page Not Found" description="The page you are looking for does not exist or has been moved." icon={SearchX} />;
}

export function Error500() {
  return <ErrorPage code="500" title="Server Error" description="Something went wrong on our end. Please try again later." icon={ServerCrash} />;
}
