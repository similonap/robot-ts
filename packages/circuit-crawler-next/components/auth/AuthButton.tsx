import { createClient } from '@/utils/supabase/server'
import LoginButton from './LoginButton'
import UserMenu from './UserMenu'

export default async function AuthButton() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    let profile = null
    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        profile = data
    }

    return user ? <UserMenu user={user} profile={profile} /> : <LoginButton />
}
