import Link from 'next/link';

import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  return (
    <div className='flex flex-col gap-8 lg:gap-32'>
      <section className='py-10 lg:py-16'>
        <Container className='rounded-lg bg-black px-6 py-10 lg:px-10 lg:py-16'>
          <div className='flex flex-col gap-4 lg:max-w-2xl'>
            <h1>字幕文件解析</h1>
            <p className='text-sm text-zinc-400'>
              拖动或选择一个字幕文件（.srt / .vtt），解析后按列表展示每条字幕。文件内容只在本地解析。
            </p>
            <div className='flex flex-wrap items-center gap-3'>
              <Button asChild variant='sexy'>
                <Link href='/subtitles'>开始使用</Link>
              </Button>
              <Button asChild variant='secondary'>
                <Link href='/pricing'>查看订阅</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
      {/* <HeroSection />
      <ExamplesSection />
      <PricingSection /> */}
    </div>
  );
}
