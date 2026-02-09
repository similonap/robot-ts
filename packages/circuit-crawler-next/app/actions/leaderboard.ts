'use server';

import { createClient } from '@/utils/supabase/server';

export type LeaderboardEntry = {
    user_id: string;
    count: number;
    profile: {
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const supabase = await createClient();

    // 1. Fetch all badge assignments (just user_ids)
    // NOTE: In a high-scale production app, this should be replaced by a database view or RPC
    // to avoid fetching all rows. For now, this is sufficient.
    const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select('user_id');

    if (badgesError) {
        console.error('Error fetching leaderboard badges:', badgesError);
        return [];
    }

    // 2. Aggregate counts
    const counts: Record<string, number> = {};
    badges.forEach((b) => {
        counts[b.user_id] = (counts[b.user_id] || 0) + 1;
    });

    // 3. Sort and slice top 100
    const sortedUsers = Object.entries(counts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 100);

    if (sortedUsers.length === 0) {
        return [];
    }

    const userIds = sortedUsers.map(([id]) => id);

    // 4. Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

    if (profilesError) {
        console.error('Error fetching leaderboard profiles:', profilesError);
        // We continue even if profiles fail to load, showing partial data is better than nothing
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // 5. Construct result
    return sortedUsers.map(([userId, count]) => ({
        user_id: userId,
        count,
        profile: profileMap.get(userId) || null
    }));
}
