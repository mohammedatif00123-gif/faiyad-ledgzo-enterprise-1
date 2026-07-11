import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { ROUTES, ROLES } from '../../constants';
import { useSelector } from 'react-redux';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const handleSkip = () => {
    if (user?.role === ROLES.ADMIN) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } else {
      navigate(ROUTES.EMPLOYEE_DASHBOARD, { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>You are required to change your password on first login.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This module is scheduled for development in a future phase. For now, you can skip this step to access your dashboard.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSkip} className="w-full">
            Skip for now & Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
