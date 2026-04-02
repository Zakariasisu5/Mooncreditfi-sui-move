import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Wallet, CheckCircle, ArrowRight } from 'lucide-react';

/**
 * Visual representation of MetaMask-style connection flow
 * Shows users what to expect
 */
const WalletConnectionFlow = () => {
  const steps = [
    {
      icon: <Wallet className="h-6 w-6 text-primary" />,
      title: 'Click Connect',
      description: 'One-click connection',
    },
    {
      icon: <Smartphone className="h-6 w-6 text-blue-500" />,
      title: 'Wallet Opens',
      description: 'Automatically opens your wallet app',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      title: 'Approve',
      description: 'Approve in your wallet',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      title: 'Connected',
      description: 'Return to dApp connected',
    },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">How Wallet Connection Works</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          MetaMask-style one-click connection
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center space-y-3">
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {step.icon}
                </div>
                
                {/* Step number */}
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                
                {/* Title */}
                <h3 className="font-semibold">{step.title}</h3>
                
                {/* Description */}
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              
              {/* Arrow between steps (not on last step) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-6 text-muted-foreground">
                  <ArrowRight className="h-6 w-6" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Mobile note */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            <strong>Mobile:</strong> Wallet app opens automatically. Approve and return to dApp.
            <br />
            <strong>Desktop:</strong> Browser extension popup appears. Approve to connect.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletConnectionFlow;
