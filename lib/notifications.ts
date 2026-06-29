import type { SupabaseClient } from '@supabase/supabase-js'

export type Notif = {
  id: string
  kind: 'request' | 'routine' | 'group'
  ts: string
  actorName: string
  actorAvatar: string | null
  text: string
  href: string | null
  requestId?: string
}

type Prof = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null }

function nameOf(p?: Prof): string {
  return p?.handle ? `@${p.handle}` : p?.display_name || 'alguien'
}

// Deriva las notificaciones del usuario a partir de los datos existentes
// (sin tabla dedicada): solicitudes de amistad, rutinas nuevas de amigos y
// comunidades a las que te sumaron.
export async function fetchNotifications(supabase: SupabaseClient, userId: string): Promise<Notif[]> {
  const notifs: Notif[] = []

  // Amistades donde participo.
  const { data: fr } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  const friendships = (fr as { id: string; requester_id: string; addressee_id: string; status: string; created_at: string }[]) || []

  const incoming = friendships.filter((f) => f.status === 'pending' && f.addressee_id === userId)
  const friendIds = friendships
    .filter((f) => f.status === 'accepted')
    .map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id))

  // Rutinas públicas recientes de mis amigos.
  let routines: { id: string; name: string; owner_id: string; created_at: string }[] = []
  if (friendIds.length) {
    const { data } = await supabase
      .from('routines')
      .select('id, name, owner_id, created_at')
      .in('owner_id', friendIds)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(20)
    routines = data || []
  }

  // Comunidades a las que me sumaron (soy member, no dueño).
  const { data: gm } = await supabase
    .from('group_members')
    .select('group_id, role, created_at, group:groups(id, name, owner_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  const groupAdds = ((gm as any[]) || [])
    .map((m) => {
      const g = Array.isArray(m.group) ? m.group[0] : m.group
      return g ? { groupId: g.id, name: g.name as string, ownerId: g.owner_id as string, role: m.role as string, created_at: m.created_at as string } : null
    })
    .filter((m): m is { groupId: string; name: string; ownerId: string; role: string; created_at: string } => !!m)
    .filter((m) => m.ownerId !== userId)

  // Resolver perfiles de actores (solicitantes + dueños de rutinas).
  const actorIds = [...new Set([...incoming.map((f) => f.requester_id), ...routines.map((r) => r.owner_id)])]
  const profById: Record<string, Prof> = {}
  if (actorIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', actorIds)
    ;(profs || []).forEach((p: Prof) => (profById[p.id] = p))
  }

  incoming.forEach((f) => {
    notifs.push({
      id: `req-${f.id}`,
      kind: 'request',
      ts: f.created_at,
      actorName: nameOf(profById[f.requester_id]),
      actorAvatar: profById[f.requester_id]?.avatar_url ?? null,
      text: 'te envió una solicitud de amistad',
      href: null,
      requestId: f.id,
    })
  })

  routines.forEach((r) => {
    notifs.push({
      id: `rt-${r.id}`,
      kind: 'routine',
      ts: r.created_at,
      actorName: nameOf(profById[r.owner_id]),
      actorAvatar: profById[r.owner_id]?.avatar_url ?? null,
      text: `publicó la rutina "${r.name}"`,
      href: `/r/${r.id}`,
    })
  })

  groupAdds.forEach((g) => {
    notifs.push({
      id: `gr-${g.groupId}`,
      kind: 'group',
      ts: g.created_at,
      actorName: '',
      actorAvatar: null,
      text: `Te sumaste a la comunidad "${g.name}"`,
      href: `/groups/${g.groupId}`,
    })
  })

  return notifs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
}

// ¿Cuántas notificaciones sin leer? (solicitudes siempre cuentan; el resto, las
// posteriores a la última visita.)
export function countUnread(notifs: Notif[], seenAt: string | null): number {
  const seen = seenAt ? new Date(seenAt).getTime() : 0
  return notifs.filter((n) => n.kind === 'request' || new Date(n.ts).getTime() > seen).length
}
