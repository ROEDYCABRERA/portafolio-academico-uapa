export type Participant = {
  id: string
  code: string
  full_name: string | null
  enrollment?: string | null
  professional_area: string | null
  email?: string | null
  photo_path: string | null
  bio: string | null
  participation_status: 'active' | 'paused' | 'completed'
  joined_at: string
  user_id?: string | null
}

export type Course = {
  id: string
  trimester: number
  course_number: number
  title: string
  description: string | null
  is_placeholder: boolean
  status: 'pending' | 'in_progress' | 'review' | 'completed'
}

export type Experience = {
  id: string
  participant_id: string
  course_id: string
  title: string
  description: string
  learning_date: string | null
  status: 'draft' | 'review' | 'published'
  created_at: string
}

export type Evidence = {
  id: string
  experience_id: string
  title: string
  description: string | null
  storage_path: string
  mime_type: string | null
  file_size: number | null
  status: 'draft' | 'review' | 'published'
}

export type Reflection = {
  id: string
  participant_id: string
  course_id: string | null
  title: string
  body: string
  reflection_type: 'individual' | 'group'
  status: 'draft' | 'review' | 'published'
  created_at: string
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En curso', review: 'En revisión', completed: 'Completado',
  draft: 'Borrador', published: 'Publicado', active: 'Activo', paused: 'En pausa',
}
