import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwgeqzpqhudqjlcptzin.supabase.co'
const supabaseKey = 'sb_publishable_PN8vuzFXlWUS5hrVaZS7Xg_0vjBo56X'

export const supabase = createClient(supabaseUrl, supabaseKey)