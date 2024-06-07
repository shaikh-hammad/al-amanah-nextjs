import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

import Image from 'next/image';
import logoImage from '@/public/amanah_combined.png';

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
      <div className="mx-auto mb-4">
          <Image src={logoImage} alt="Logo" width={200} height={200} />
        </div>
        <h1 className="text-lg font-semibold">
          Welcome to Al-Amanah, the Islamic Assistant!
        </h1>
        <p className="leading-normal text-muted-foreground">
          This is an Islamic AI chatbot trained on The Holy Quran and authentic Hadiths.
        </p>
        <p className="leading-normal text-muted-foreground">
          
        </p>
      </div>
    </div>
  )
}
