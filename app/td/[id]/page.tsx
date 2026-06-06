import { redirect } from 'next/navigation'

export default function TournamentRedirect({ params }: { params: { id: string } }) {
  redirect(`/td/tournaments/${params.id}`)
}
