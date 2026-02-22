'use server';

import { createClient } from '@/utils/supabase/server';

export async function awardBadge(slug: string, ticks?: number) {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'User not authenticated' };
    }

    // Check if the badge already exists
    const { data: existingBadge } = await supabase
        .from('user_badges')
        .select('id, ticks')
        .eq('user_id', user.id)
        .eq('badge_slug', slug)
        .single();

    if (existingBadge) {
        // We already have the badge. Update ticks if the new solve is more efficient (fewer ticks).
        // If you explicitly meant strictly "higher" ticks, you can change the `<` to `>`.
        if (ticks !== undefined && (existingBadge.ticks === null || ticks < existingBadge.ticks)) {
            const { error: updateError } = await supabase
                .from('user_badges')
                .update({ ticks })
                .eq('id', existingBadge.id);

            if (updateError) {
                console.error('Error updating badge ticks:', updateError);
                return { success: false, message: updateError.message };
            }
        }
        return { success: true, new: false, slug };
    }

    // Otherwise, insert the new badge
    const { error: insertError } = await supabase
        .from('user_badges')
        .insert({
            user_id: user.id,
            badge_slug: slug,
            ticks,
        });

    if (insertError) {
        console.error('Error awarding badge:', insertError);
        return { success: false, message: insertError.message };
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
