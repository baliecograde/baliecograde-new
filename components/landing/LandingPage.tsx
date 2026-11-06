'use client';
import { HeroSection } from '@/components/landing/HeroSection';
import { ResultCard } from '@/components/landing/ResultCard';
import { UploadCard } from '@/components/landing/UploadCard';
import { Navbar } from '@/components/layout/Navbar';
import { useTheme } from '@/hooks/useTheme';
import { useUserArea } from '@/hooks/useUserArea';
import { useWasteScan } from '@/hooks/useWasteScan';

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const userArea = useUserArea();
  const scan = useWasteScan();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar userArea={userArea} theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <HeroSection />
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:gap-8">
          <UploadCard
            previewUrl={scan.previewUrl}
            hasFile={scan.hasFile}
            isScanning={scan.status === 'scanning'}
            message={scan.message}
            locationStatus={userArea.status}
            onRetryLocation={userArea.requestLocation}
            onFileSelect={scan.selectFile}
            onClear={scan.clearFile}
            onClassify={scan.classify}
          />
          <ResultCard
            status={scan.status}
            outcome={scan.outcome}
            showUncertainDialog={scan.showUncertainDialog}
            onDismissUncertainDialog={scan.dismissUncertainDialog}
            onFileSelect={scan.selectFile}
          />
        </div>
      </main>
    </div>
  );
}
