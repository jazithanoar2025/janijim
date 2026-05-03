import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JanijimRedirectPage({ params }: Props) {
  const { id } = await params
  redirect(`/grupo/${id}/gestion`)
}
