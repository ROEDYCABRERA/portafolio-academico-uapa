import { notFound } from 'next/navigation'
import { PublicPortfolio } from '@/components/portfolio/public-portfolio'

export default async function TrimesterPage({ params }: { params: Promise<{ trimester: string }> }) {
  const { trimester: rawTrimester } = await params
  const trimester = Number(rawTrimester)
  if (!Number.isInteger(trimester) || trimester < 1 || trimester > 4) notFound()
  return <PublicPortfolio view="trimester" trimester={trimester} />
}
