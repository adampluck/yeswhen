import { supabase } from './supabase'

// Dates travel as 'YYYY-MM-DD' strings everywhere.
export type DateStr = string

export interface Participant {
  id: string
  name: string
  dates: DateStr[]
}

export interface EventData {
  title: string
  dates: DateStr[]
  participants: Participant[]
}

export interface AdminEventData extends EventData {
  share_token: string
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export function createEvent(title: string, dates: DateStr[]) {
  return rpc<{ admin_token: string; share_token: string }>('yw_create_event', {
    p_title: title,
    p_dates: dates,
  })
}

export function getEventAdmin(adminToken: string) {
  return rpc<AdminEventData | null>('yw_get_event_admin', { p_admin_token: adminToken })
}

export function updateEvent(adminToken: string, title: string, dates: DateStr[]) {
  return rpc<boolean>('yw_update_event', {
    p_admin_token: adminToken,
    p_title: title,
    p_dates: dates,
  })
}

export function deleteResponse(adminToken: string, participantId: string) {
  return rpc<boolean>('yw_delete_response', {
    p_admin_token: adminToken,
    p_participant_id: participantId,
  })
}

export function getEvent(shareToken: string) {
  return rpc<EventData | null>('yw_get_event', { p_share_token: shareToken })
}

export function addResponse(shareToken: string, name: string, dates: DateStr[]) {
  return rpc<{ edit_token: string; id: string }>('yw_add_response', {
    p_share_token: shareToken,
    p_name: name,
    p_dates: dates,
  })
}

export function updateResponse(editToken: string, name: string, dates: DateStr[]) {
  return rpc<boolean>('yw_update_response', {
    p_edit_token: editToken,
    p_name: name,
    p_dates: dates,
  })
}
