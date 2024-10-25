"use client";
import { Suspense } from 'react'
import  Hero  from '@/components/sections/Hero'
import  Features  from '@/components/sections/Features'
import  Testimonials  from '@/components/sections/Testimonials'
import  CallToAction  from '@/components/sections/CallToAction'
import  Footer  from '@/components/sections/Footer'
import  Navigation  from '@/components/navigation/Navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100">
      
      <Suspense fallback={<LoadingSpinner />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <Features />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <Testimonials />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <CallToAction />
      </Suspense>
      <Footer />
    </div>
  )
}