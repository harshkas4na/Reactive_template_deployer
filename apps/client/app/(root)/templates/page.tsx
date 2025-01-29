import { Suspense } from 'react'
import TemplatesGrid from '@/components/templates/TemplateGrid'
import LoadingCard from '@/components/templates/LoadingCard'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
      <div className="text-center z-100 mb-12">
          <h1 className="z-10 text-3xl sm:text-4xl font-bold mb-4 text-gray-100">
            Templates
          </h1>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            Explore RSC implementation examples and share your automation ideas. 
            Help shape the future of no-code DeFi automations by contributing your use cases.
          </p>
        </div>

        <Suspense 
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              <LoadingCard />
              <LoadingCard />
            </div>
          }
        >
          <TemplatesGrid />
        </Suspense>
      </div>
    </div>
  );
}