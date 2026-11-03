import { useState } from 'react';
import { Play } from 'lucide-react';
import { usePresenter } from '@/context/PresenterContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function GuidedDemoButton({ compact = false }: { compact?: boolean }) {
  const { start, isActive } = usePresenter();
  const [loading, setLoading] = useState(false);

  if (isActive) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      await start();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="primary"
      size={compact ? 'icon' : 'sm'}
      className={cn(!compact && 'w-full gap-2')}
      isLoading={loading}
      onClick={() => void handleClick()}
      title="Start guided demo"
      aria-label="Start guided demo"
    >
      <Play className="h-4 w-4" />
      {!compact && 'Guided demo'}
    </Button>
  );
}
