'use server';

import { createClient } from '@/utils/supabase/server';

export async function awardBadge(slug: string) {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'User not authenticated' };
    }

    // Try to insert the badge
    // We rely on the UNIQUE constraint to fail if it already exists
    const { error } = await supabase
        .from('user_badges')
        .insert({
            user_id: user.id,
            badge_slug: slug
        });

    if (error) {
        // If error code is unique violation (23505), it's fine, they already have it
        if (error.code === '23505') {
            return { success: true, new: false, slug };
        }
        console.error('Error awarding badge:', error);
        return { success: false, message: error.message };
    }

    return { success: true, new: true, slug };
}

// Update return type to include null
export async function getUserBadges(): Promise<({ badge_slug: string, created_at: string }[]) | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from('user_badges')
        .select('badge_slug, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching badges:', error);
        return [];
    }

    return data;
}
